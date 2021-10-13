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
  },
}
