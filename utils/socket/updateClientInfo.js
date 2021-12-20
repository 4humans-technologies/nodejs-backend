const onDisconnectStreamEndHandler = require("./disconnect/streamEndHandler")
const onDisconnectCallEndHandler = require("./disconnect/callEndHandler")
const jwt = require("jsonwebtoken")
const chatEventListeners = require("./chat/chatEventListeners")
const { cloneDeep } = require("lodash")
const io = require("../../socket")
const { viewerJoined } = require("../socket/socketEvents")
const { viewer_left_received } = require("./chat/chatEvents")

module.exports = function updateClientInfo(client) {
  client.on("update-client-info", (data, callback) => {
    /* action specific procedure */
    switch (data.action) {
      case "logout":
        {
          /* end streaming also */
          if (client.authed && client.isStreaming) {
            onDisconnectStreamEndHandler(client)
          }
          /* end call properly */
          if (client.authed && client.onCall) {
            onDisconnectCallEndHandler(client)
          }

          /* NEEDED of all this, because anyway this client NOT be deleted */
          /* leave all the rooms you were connected to as authed user */
          Array.from(client.rooms).forEach((myRoom) => {
            if (myRoom.endsWith("-public")) {
              client.leave(myRoom)
              client.in(myRoom).emit(viewer_left_received, {
                roomSize: io.getIO().sockets.adapter.rooms.get(myRoom)?.size,
                relatedUserId: client.data?.relatedUserId,
              })
              /* free data keys */
              delete client.onStream
              delete client.streamId
            }
          })

          /* remove all chat listeners from user */

          switch (client.userType) {
            case "Model":
              client.removeAllListeners(chatEventListeners.modelEventList)
              break
            case "Viewer":
              client.removeAllListeners(chatEventListeners.authedUserEventList)
              break
            default:
              break
          }
          /* add new listeners */
          chatEventListeners.unAuthedViewerListeners(client)

          /* clear the data set on the client object */
          const dataCopy = cloneDeep(client.data)
          delete dataCopy.userId
          delete dataCopy.relatedUserId
          client.data = { ...dataCopy }
          client.authed = false
          client.userType = "UnAuthedViewer"

          callback({
            ok: true,
          })
        }
        break
      case "login":
        if (data.token) {
          try {
            jwt.verify(
              data.token,
              process.env.SECRET,
              (error, decodedToken) => {
                if (!error) {
                  if (decodedToken) {
                    client.data = {
                      ...client.data,
                      userId: decodedToken.userId,
                      relatedUserId: decodedToken.relatedUserId,
                    }
                    client.authed = true
                    client.userType = decodedToken.userType
                    client.removeAllListeners(
                      chatEventListeners.unAuthedViewerEventList
                    )
                    switch (client.userType) {
                      case "Model":
                        chatEventListeners.modelListeners(client)
                        break
                      case "Viewer":
                        chatEventListeners.authedViewerListeners(client)
                        break
                      default:
                        break
                    }
                    client.join(`${decodedToken.relatedUserId}-private`)
                    callback({
                      ok: true,
                    })
                  }
                } else {
                  console.error("Error wrong jwt send with socket")
                }
              }
            )
          } catch (err) {
            console.error(err?.message)
          }
        } else {
          console.log("socket login request without token")
        }
        break
      case "join-the-stream-model":
        {
          /**
           * fired when due to err client was not able to join the
           * public rooms and also due to this no was was notified
           * of this user
           */
          delete client.onCall
          delete client.sharePercent
          delete client.callId
          delete client.callType

          client.isStreaming = true
          client.streamId = data.streamId
          client.createdAt = Date.now() - 800
        }
        break
      case "join-the-stream-unauthed-viewer":
        {
          /**
           * fired when due to err client was not able to join the
           * public rooms and also due to this no was was notified
           * of this user
           */
          client.onStream = true
          client.streamId = data.streamId
          const streamRoom = `${data.streamId}-public`
          client.join(streamRoom)
          io.getIO()
            .in(streamRoom)
            .emit(viewerJoined, {
              roomSize: io.getIO().sockets.adapter.rooms.get(streamRoom)?.size,
            })
        }
        break
      case "join-the-stream-authed-viewer":
        {
          /**
           * fired when due to err client was not able to join the
           * public rooms and also due to this no was was notified
           * of this user
           */
          delete client.onCall
          delete client.sharePercent
          delete client.callId
          delete client.callType

          if (!client.authed) {
            return
          }
          client.onStream = true
          client.streamId = data.streamId
          const streamRoom = `${data.streamId}-public`
          client.join(streamRoom)
          if (client.data?.relatedUserId) {
            client.join(`${client.data.relatedUserId}-private`)
          }

          const roomSize = io
            .getIO()
            .sockets.adapter.rooms.get(streamRoom)?.size

          io.getIO().in(streamRoom).emit(viewerJoined, {
            roomSize: roomSize,
          })

          io.getIO()
            .in(data.modelRoom)
            .emit(`${viewerJoined}-private`, {
              roomSize: roomSize,
              viewer: { ...data.viewerDetails },
            })
        }
        break
      case "rejoin-the-stream-authed-viewer":
        {
          /**
           * fired when due to err client was not able to join the
           * public rooms and also due to this no was was notified
           * of this user
           */

          delete client.onCall
          delete client.sharePercent
          delete client.callId
          delete client.callType

          if (!client.authed) {
            return
          }
          client.onStream = true
          client.streamId = data.streamId
          const streamRoom = `${data.streamId}-public`
          client.join(streamRoom)

          if (client.data?.relatedUserId) {
            client.join(`${client.data.relatedUserId}-private`)
          }

          /* emit to the model */
          io.getIO().in(data.modelRoom).emit(`${viewerJoined}-private`, {
            reJoin: true,
            relatedUserId: client.data.relatedUserId,
          })
        }
        break
      case "clear-call-details":
        {
          /**
           * called when model or viewer was not able to clear
           * out call detail from socket
           */

          delete client.onCall
          delete client.sharePercent
          delete client.callId
          delete client.callType
          callback({
            ok: true,
          })
        }
        break
      case "set-call-data-viewer":
        {
          /**
           * called when model or viewer was not able to
           * add call details on the client socket
           */
          if (client.userType === "Viewer") {
            delete client.onStream
            delete client.streamId

            client.onCall = true
            client.sharePercent = data.sharePercent
            client.callId = data.callId
            client.callType = data.callType

            callback({
              ok: true,
            })
          }
        }
        break
      case "set-call-data-model":
        {
          /**
           * called when model or viewer was not able to
           * add call details on the client socket
           */
          if (client.userType === "Model") {
            delete client.isStreaming
            delete client.streamId
            delete client.createdAt

            client.onCall = true
            client.sharePercent = data.sharePercent
            client.callId = data.callId
            client.callType = data.callType
            callback({
              ok: true,
            })
          }
        }
        break
      default:
        break
    }
  })
}
