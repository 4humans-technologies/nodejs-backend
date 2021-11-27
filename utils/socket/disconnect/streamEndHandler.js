const Stream = require("../../../models/globals/Stream")
const Model = require("../../../models/userTypes/Model")
const io = require("../../../socket")
const socketEvents = require("../socketEvents")

module.exports = function onDisconnectStreamEndHandler(client) {
  try {
    console.log("🚩 a model left in between of streaming")
    Stream.findById(client.streamId)
      .then((stream) => {
        const duration =
          (Date.now() - new Date(stream.createdAt).getTime()) / 60000
        stream.endReason = "socket-disconnect"
        stream.status = "ended"
        stream.duration = duration
        return Promise.all([
          stream.save(),
          Model.updateOne(
            { _id: client.data.relatedUserId },
            {
              isStreaming: false,
              currentStream: null,
            }
          ),
        ])
      })
      .then((values) => {
        const stream = values[0]

        /* end the stream of every user, as the model has disconnected */
        const publicRoom = `${stream._id.toString()}-public`

        /* should only send this to the users who are in home page & this models stream */
        io.getIO().emit(socketEvents.deleteStreamRoom, {
          modelId: client.data.relatedUserId,
          liveNow: io.decreaseLiveCount(),
        })

        /* destroy the stream chat rooms, 
           adding timeout so that isModelOffline ste can be set the later
           when the "you-left-the-room" event occurs safely get out of the room
           will defenitely look to improve this statergy in future
        */
        setTimeout(() => {
          io.getIO().in(publicRoom).socketsLeave(publicRoom)
        }, 600)

        /* i guess no need to update client as it will be destroyed automatically */
        // client.isStreaming = false
        // client.currentStream = null
      })
      .catch((err) => {
        /* may emit to the user */
        console.log(err)
        console.error("The streaming status was not updated(closed)")
      })
  } catch (error) {
    /* log that stream was not closed */
    console.error(error)
    console.error("The streaming status was not updated(closed)")
  }
}
