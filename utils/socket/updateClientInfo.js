const onDisconnectStreamEndHandler = require("./disconnect/streamEndHandler")
const onDisconnectCallEndHandler = require("./disconnect/callEndHandler")
const jwt = require("jsonwebtoken")
const chatEventListeners = require("./chat/chatEventListeners")
const { cloneDeep } = require("lodash")

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
          Array.from(client.rooms).forEach((room) => {
            client.leave(room)
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
      case "join-the-stream":
        {
          /**
           * fired when due to err client was not able to join the
           * public rooms and also due to this no was was notified
           * of this user
           */
        }
        break
      default:
        break
    }
  })
}
