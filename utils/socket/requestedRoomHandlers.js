module.exports = function requestRoomHandlers(client) {
  client.on("putting-me-in-these-rooms", (rooms, callback) => {
    console.log("put in rooms >> ", rooms)
    if (client.userType === "UnAuthedViewer") {
      if (rooms.length === 1 && rooms[0].endsWith("-public")) {
        /* un-authed user can only join public room */
        client.join(rooms[0])
        callback({
          status: "ok",
        })
      } else {
        /* miscellaneous behaviour*/
        // client.disconnect()
        console.log(
          "miscellaneous behaviour trying to join invalid room >> ",
          rooms[0]
        )
      }
    } else if (client.authed) {
      for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].endsWith("-private")) {
          if (rooms[i].startsWith(client.data.relatedUserId)) {
            /* join his private room */
            client.join(rooms[i])
          } else {
            /* miscellaneous behaviour, why joining someone elses room*/
            // client.disconnect()
            console.log(
              "miscellaneous behaviour trying to join invalid room >> ",
              rooms[i]
            )
          }
          /* else joining "someone-"elses" room */
        } else if (rooms[i].endsWith("-public")) {
          /* put in public room */
          client.join(rooms[i])
        }
      }
      callback({
        status: "ok",
      })
    }
  })

  client.on("take-me-out-of-these-rooms", (rooms, callback) => {
    for (let i = 0; i < rooms.length; i++) {
      client.leave(rooms[i])
    }
    callback({
      status: "ok",
    })
  })
}