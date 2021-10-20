const io = require("../../../socket")
const chatEvents = require("../chat/chatEvents")

module.exports = {
  authedViewerListeners: (socket) => {
    socket.on(chatEvents.viewer_message_public_emitted, (data) => {
      io.getIO()
        .in(data.room)
        .emit(chatEvents.viewer_message_public_received, data)
    })

    socket.on(chatEvents.model_message_public_emitted, (data) => {
      io.getIO()
        .in(data.room)
        .emit(chatEvents.model_message_public_received, data)
    })

    socket.on(chatEvents.viewer_super_message_public_emitted, (data) => {
      socket
        .in(data.room)
        .emit(chatEvents.viewer_super_message_public_received, data)
    })

    /* only viewers who have private chat plan will use this, for others it is just wastage of resources 
      hence should look for optimization later 👇👇 (below 2)
    */
    socket.on(chatEvents.viewer_message_private_emitted, (data) => {
      socket
        .in(data.room)
        .emit(chatEvents.viewer_message_private_received, data)
    })

    socket.on(chatEvents.model_message_private_emitted, (data) => {
      socket
        .in(data.room)
        .emit(chatEvents.model_message_private_received, data)
    })
  },
  unAuthedViewerListeners: (socket) => {
    socket.on(chatEvents.viewer_message_public_emitted, (data) => {
      io.getIO()
        .in(data.room)
        .emit(chatEvents.viewer_message_public_received, data)
    })

    socket.on(chatEvents.model_message_public_emitted, (data) => {
      io.getIO()
        .in(data.room)
        .emit(chatEvents.model_message_public_received, data)
    })

    socket.on(chatEvents.viewer_super_message_public_emitted, (data) => {
      socket
        .in(data.room)
        .emit(chatEvents.viewer_super_message_public_received, data)
    })

    /* private chat listeners */
    socket.on(chatEvents.viewer_message_private_emitted, (data) => {
      socket
        .in(data.room)
        .emit(chatEvents.viewer_message_private_received, data)
    })

    socket.on(chatEvents.model_message_private_emitted, (data) => {
      socket
        .in(data.room)
        .emit(chatEvents.model_message_private_received, data)
    })
  },
  modelListeners: (socket) => {
    socket.on(chatEvents.viewer_message_public_emitted, (data) => {
      io.getIO()
        .in(data.room)
        .emit(chatEvents.viewer_message_public_received, data)
    })

    socket.on(chatEvents.model_message_public_emitted, (data) => {
      io.getIO()
        .in(data.room)
        .emit(chatEvents.model_message_public_received, data)
    })

    socket.on(chatEvents.viewer_super_message_public_emitted, (data) => {
      socket
        .in(data.room)
        .emit(chatEvents.viewer_super_message_public_received, data)
    })

    /* private chat listeners */
    socket.on(chatEvents.viewer_message_private_emitted, (data) => {
      socket
        .in(data.room)
        .emit(chatEvents.viewer_message_private_received, data)
    })

    socket.on(chatEvents.model_message_private_emitted, (data) => {
      socket
        .in(data.room)
        .emit(chatEvents.model_message_private_received, data)
    })
  },
}
