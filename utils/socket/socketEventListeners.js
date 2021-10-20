const socketEvents = require("./socketEvents")
const chatEvents = require("./chat/chatEvents")
const { userActionTypes } = require("./chat/chatEvents")
const io = require("../../socket")
module.exports = (client, userType) => {
  // get room size by :io.of("/yourNameSpace").adapter.rooms.get(roomId)
  // get all rooms io.sockets.adapter.rooms

  // global listeners everybody will listen to
  client.on("disconnect", () => {
    console.log(`${client.id} disconnected`)
    client
      .to(client.rooms)
      .emit(socketEvents.viewerLeft, { message: "viewer left the room" })
  })

  /* for authed-users and models */
  client.on(chatEvents.user_request_perform_action, data => {
    switch (data.actionToPerform) {
      case userActionTypes.user_update_client_data:
        client.data = data.actualData.data
        client.emit("requested-action-result-received", { message: 'client data updated successFully!' })
        break;
      case userActionTypes.user_update_client_data_and_userType:
        client.data = data.actualData.data
        client.userType = data.actualData.userType
        client.emit("requested-action-result-received", { message: 'client data updated successFully!' })
        break;
      case userActionTypes.user_reporting_pending_calls:
        /* do what u wanna do */
        console.log("user reported pending calls!")
        break;
      default:
        break;
    }
  })

  client.on(chatEvents.got_notification_for_user, (data) => {
    client.in(data.room).emit(chatEvents.send_notification_to_user, data)
  })
}
