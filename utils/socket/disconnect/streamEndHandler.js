const Stream = require("../../../models/globals/Stream")
const Model = require("../../../models/userTypes/Model")
const io = require("../../../socket")
const redisClient = require("../../../redis")
const socketEvents = require("../socketEvents")

module.exports = function onDisconnectStreamEndHandler(client) {
  const duration = (Date.now() - client.createdAt) / 1000 /* in seconds */

  Promise.all([
    Stream.findOneAndUpdate(
      {
        _id: client.streamId,
      },
      {
        endReason: "socket-disconnect",
        status: "ended",
        duration: Math.round(duration),
        // moneySpent: Number, Have to run seaprate query to find all the token histories related to this stream
      },
      { new: false }
    )
      .select("status endReason")
      .lean(),
    Model.findOneAndUpdate(
      { _id: client.data.relatedUserId },
      {
        isStreaming: false,
        currentStream: null,
        onCall: false,
      },
      { new: false }
    )
      .select("currentStream isStreaming")
      .lean(),
  ])
    .then(([stream, model]) => {
      /**
       * below code is just for analytics purpose
       */
      if (stream) {
        if (stream?.status === "ended") {
          console.error(
            "Stream was ended already still, on disconnect handler ran"
          )
        }
      }
      if (model) {
        if (model?.isStreaming === false) {
          console.error(
            "Model was not streaming still, on disconnect handler ran"
          )
        }
      }
      const publicRoom = `${client.streamId}-public`
      redisClient.del(publicRoom, (err, response) => {
        if (!err) {
          console.log("Stream delete redis response:", response)
          io.getIO().emit(socketEvents.deleteStreamRoom, {
            modelId: client.data.relatedUserId,
            liveNow: io.decreaseLiveCount(client.data.relatedUserId),
          })

          /* destroy the stream chat rooms, 
              adding timeout so that isModelOffline ste can be set the later
              when the "you-left-the-room" event occurs safely get out of the
              room (problem due to setInterval running in loop)
              will definitely look to improve this strategy in future
            */
          setTimeout(() => {
            io.getIO().in(publicRoom).socketsLeave(publicRoom)
          }, 1000)
        } else {
          throw err
        }
      })
    })
    .catch((err) => {
      /* log that stream was not closed */
      console.error(
        "The streaming status was not updated(closed) Reason: ",
        err.message
      )

      /**
       * in the event of error also, pull the model out of liveModelsCount
       */

      io.getIO().emit(socketEvents.deleteStreamRoom, {
        modelId: client.data.relatedUserId,
        liveNow: io.decreaseLiveCount(client.data.relatedUserId),
      })

      const publicRoom = `${client.streamId}-public`
      /* see reason written above to find the setTimeout reason */
      setTimeout(() => {
        io.getIO().in(publicRoom).socketsLeave(publicRoom)
      }, 1000)
    })
}
