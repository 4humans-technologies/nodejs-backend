const io = require("../../../socket")
const chatEvents = require("../chat/chatEvents")
const ModelViewerPrivateChat = require("../../../models/ModelViewerPrivateChat")

module.exports = {
  authedViewerListeners: (socket) => {
    /* public message emitter */
    socket.on(chatEvents.viewer_message_public_emitted, (data) => {
      io.getIO()
        .in(data.room)
        .emit(chatEvents.viewer_message_public_received, data)
    })

    /* public super chat listener */
    socket.on(chatEvents.viewer_super_message_public_emitted, (data) => {
      socket
        .in(data.room)
        .emit(chatEvents.viewer_super_message_public_received, data)
    })

    /* only viewers who have private chat plan will use this, for others it is just wastage of resources 
      hence should look for optimization later 👇👇 (below 2)
    */
    socket.on(chatEvents.viewer_private_message_emitted, (data) => {
      /* after emitting save the chats to the db */
      ModelViewerPrivateChat.updateOne(
        {
          _id: data.dbId,
        },
        {
          $push: { chats: data.chat },
        }
      )
        .then((result) => {
          if (result.n === 1) {
            socket
              .to(data.to)
              .emit(chatEvents.viewer_private_message_received, data)
          }
        })
        .catch((err) => console.warn(err.message || err.msg))
    })

    /* should add this only on user which has on going call */
    /* 🔺🔺 this has hig scope of removal in future and can emitted from the http request done for the call end🔻🔻 */
    socket.on(chatEvents.viewer_call_end_request_init_emitted, (data) => {
      socket
        .to(data.room)
        .emit(chatEvents.viewer_call_end_request_init_received, data)
    })
  },
  unAuthedViewerListeners: (socket) => {
    /* un-authed public chat emitter */
    socket.on(chatEvents.viewer_message_public_emitted, (data) => {
      io.getIO()
        .in(data.room)
        .emit(chatEvents.viewer_message_public_received, data)
    })
  },
  modelListeners: (socket) => {
    /* model public chat emitter */
    socket.on(chatEvents.model_message_public_emitted, (data) => {
      io.getIO()
        .in(data.room)
        .emit(chatEvents.model_message_public_received, data)
    })

    /* model private chat emitter */
    socket.on(chatEvents.model_private_message_emitted, (data) => {
      /* after emitting save the chats to the db */
      ModelViewerPrivateChat.updateOne({
        _id: data.dbId,
        $push: { chats: data.chat },
      })
        .then((result) => {
          if (result.n === 1) {
            socket
              .in(data.to)
              .emit(chatEvents.model_private_message_received, data)
          }
        })
        .catch((err) => console.warn(err.message || err.msg))
    })

    /* model call end request emitter */
    socket.on(chatEvents.model_call_end_request_init_emitted, (data) => {
      socket
        .to(data.room)
        .emit(chatEvents.model_call_end_request_init_received, data)
    })
  },
}
