const io = require("../../../socket")
const chatEvents = require("../chat/chatEvents")
const ModelViewerPrivateChat = require("../../../models/ModelViewerPrivateChat")
const { getDatabase } = require("firebase-admin/database")

const realtimeDb = getDatabase()

module.exports = {
  authedViewerListeners: (socket) => {
    /* public message emitter */
    try {
      /* can get this message payload as string and streamId as other parameter😀 */
      socket.on(chatEvents.viewer_message_public_emitted, (data) => {
        const toRoom = data.room.split("-")[0]
        if (toRoom) {
          realtimeDb
            .ref("publicChats")
            .child(toRoom)
            .child("chats")
            .push({
              type: "normal-public-message",
              ...data,
            })
            .then(() => {
              io.getIO()
                .in(data.room)
                .emit(chatEvents.viewer_message_public_received, data)
            })
            .catch(() => {
              /* even if error emmit the message */
              io.getIO()
                .in(data.room)
                .emit(chatEvents.viewer_message_public_received, data)
            })
        } else {
          console.error("No destination room while authed user chat message!")
        }
      })
    } catch (err) {
      console.error("Error while sending public chat reason: " + err.message)
    }

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
  modelListeners: (socket) => {
    /* model public chat emitter */
    socket.on(chatEvents.model_message_public_emitted, (data) => {
      try {
        const toRoom = data.room.split("-")[0]
        /**
         * if room then only proceed
         */
        if (toRoom) {
          realtimeDb
            .ref("publicChats")
            .child(toRoom)
            .child("chats")
            .push({
              type: "model-public-message",
              ...data,
            })
            .then(() => {
              io.getIO()
                .in(data.room)
                .emit(chatEvents.model_message_public_received, data)
            })
            .catch(() => {
              /* even if error emmit the message */
              io.getIO()
                .in(data.room)
                .emit(chatEvents.viewer_message_public_received, data)
            })
        } else {
          console.error("No destination room while model chat message!")
        }
      } catch (err) {
        console.error("Model's public message was not sent reason: ", err)
      }
    })

    /* model private chat emitter */
    socket.on(chatEvents.model_private_message_emitted, (data) => {
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

    /* when model declines the call */
    /* should later add this event listener when the viewer requests the call, and with .once rule */
    socket.on(chatEvents.model_call_request_response_emitted, (data) => {
      socket
        .to(data.room)
        .emit(chatEvents.model_call_request_response_received, data)
    })
  },
  unAuthedViewerListeners: (socket) => {
    /* un-authed public chat emitter */
    socket.on(chatEvents.viewer_message_public_emitted, (data) => {
      try {
        const toRoom = data.room.split("-")[0]
        /**
         * if room then only proceed
         */
        if (toRoom) {
          realtimeDb
            .ref("publicChats")
            .child(toRoom)
            .child("chats")
            .push({
              type: "normal-public-message",
              ...data,
            })
            .then(() => {
              io.getIO()
                .in(data.room)
                .emit(chatEvents.viewer_message_public_received, data)
            })
            .catch(() => {
              /* even if error emmit the message */
              io.getIO()
                .in(data.room)
                .emit(chatEvents.viewer_message_public_received, data)
            })
        } else {
          console.error(
            "No destination room while un-authed user chat message!"
          )
        }
      } catch (err) {
        console.error("Error while chat message", err)
      }
    })
  },

  authedUserEventList: [
    chatEvents.viewer_message_public_emitted,
    chatEvents.viewer_super_message_public_emitted,
    chatEvents.viewer_private_message_emitted,
    chatEvents.viewer_call_end_request_init_emitted,
  ],
  unAuthedViewerEventList: [chatEvents.viewer_message_public_emitted],
  modelEventList: [
    chatEvents.viewer_message_public_emitted,
    chatEvents.model_private_message_emitted,
    chatEvents.model_call_end_request_init_emitted,
  ],
}
