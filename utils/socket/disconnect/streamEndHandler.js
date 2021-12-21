const Stream = require("../../../models/globals/Stream")
const Model = require("../../../models/userTypes/Model")
const io = require("../../../socket")
const redisClient = require("../../../redis")
const socketEvents = require("../socketEvents")

module.exports = function onDisconnectStreamEndHandler(client) {
  const duration = (Date.now() - client.createdAt) / 60000

  Promise.all([
    Stream.findOneAndUpdate(
      {
        _id: client.streamId,
      },
      {
        endReason: "socket-disconnect",
        status: "ended",
        duration: duration,
      }
    )
      .select("status endReason")
      .lean(),
    Model.findOneAndUpdate(
      { _id: client.data.relatedUserId },
      {
        isStreaming: false,
        currentStream: null,
        onCall: false,
      }
    )
      .select("currentStream isStreaming")
      .lean(),
  ])
    .then(([stream, model]) => {
      if (
        stream.status !== "ended" &&
        model.isStreaming &&
        model.currentStream
      ) {
        /**
         * if stream was actually ongoing and model was live
         * then only emit the event
         */

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
      }
    })
    .catch((err) => {
      /* may emit to the user */
      /* log that stream was not closed */
      console.error(
        "The streaming status was not updated(closed) Reason: ",
        err.message
      )

      const publicRoom = `${client.streamId}-public`
      /* see reason written above to find the setTimeout reason */
      setTimeout(() => {
        io.getIO().in(publicRoom).socketsLeave(publicRoom)
      }, 1000)
    })
}
