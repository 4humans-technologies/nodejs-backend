const Stream = require("../../../models/globals/Stream")
const Model = require("../../../models/userTypes/Model")
const io = require("../../../socket")
const socketEvents = require("../socketEvents")

module.exports = function onDisconnectStreamEndHandler(client) {
  const duration = (Date.now() - client.createdAt) / 60000

  Promise.all([
    Stream.updateOne(
      {
        _id: client.streamId,
      },
      {
        endReason: "socket-disconnect",
        status: "ended",
        duration: duration,
      }
    ),
    Model.updateOne(
      { _id: client.data.relatedUserId },
      {
        isStreaming: false,
        currentStream: null,
      }
    ),
  ])
    .then((values) => {
      if (values[0].n + values[1].n === 2) {
        /* model and stream updated */
        /* end the stream of every user, as the model has disconnected */
        const publicRoom = `${client.streamId}-public`

        /* should only send this to the users who are in home page & this models stream */
        io.getIO().emit(socketEvents.deleteStreamRoom, {
          modelId: client.data.relatedUserId,
          liveNow: io.decreaseLiveCount(),
        })

        /* destroy the stream chat rooms, 
           adding timeout so that isModelOffline ste can be set the later
           when the "you-left-the-room" event occurs safely get out of the room (problem due to setInterval running in loop)
           will definitely look to improve this strategy in future
        */

        setTimeout(() => {
          io.getIO().in(publicRoom).socketsLeave(publicRoom)
        }, 1000)

        /* i guess no need to update client as it will be destroyed automatically */
        // client.isStreaming = false
        // client.currentStream = null
      } else {
        return Promise.reject("Stream or model data was not updated")
      }
    })
    .catch((err) => {
      /* may emit to the user */
      /* log that stream was not closed */
      console.log(err)
      console.error(
        "The streaming status was not updated(closed) :Reason: ",
        err.message
      )
      const publicRoom = `${client.streamId.toString()}-public`
      io.getIO().emit(socketEvents.deleteStreamRoom, {
        modelId: client.data.relatedUserId,
        liveNow: io.decreaseLiveCount(),
      })

      /* see reason above to find the setTimeout reason */
      setTimeout(() => {
        io.getIO().in(publicRoom).socketsLeave(publicRoom)
      }, 600)
    })
}
