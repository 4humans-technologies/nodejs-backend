const io = require("../../socket")
const chatEvents = require("./chat/chatEvents")
const redisClient = require("../../redis")

module.exports = function requestRoomHandlers(client) {
  client.on("putting-me-in-these-rooms", (rooms, callback) => {
    try {
      if (client.userType === "UnAuthedViewer") {
        if (rooms.length === 1 && rooms[0].endsWith("-public")) {
          /* un-authed user can only join public room */
          client.join(rooms[0])
          callback({
            status: "ok",
          })
        } else {
          /* miscellaneous behaviour*/
          console.log(
            "miscellaneous behaviour trying to join invalid room >> ",
            rooms
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
    } catch (err) {
      console.error("Error while putting in room ", err)
      console.error("relatedUserId ", client.data.relatedUserId)
      console.error("userType ", client.userType)
    }
  })

  function handleRedisCleanUp(client, myRoom, callBack) {
    /* handle it, we just have to  */
    if (client.authed) {
      redisClient.get(myRoom, (err, viewers) => {
        if (err) {
          console.error("Redis error while authed viewer leaving redis room")
        }
        if (viewers) {
          viewers = JSON.parse(viewers)
          viewers = viewers.filter(
            (viewer) => viewer._id !== client.data.relatedUserId
          )
          redisClient.set(myRoom, JSON.stringify(viewers), (err) => {
            if (err) {
              return console.error(
                "Viewer not removed from viewers list Redis err: ",
                err
              )
            }
            io.getIO()
              .in(myRoom)
              .emit(chatEvents.viewer_left_received, {
                roomSize: io.getIO().sockets.adapter.rooms.get(myRoom)?.size,
                relatedUserId: client.data.relatedUserId,
              })
            // callBack()
          })
        } else {
          return console.error("No viewers in redis for room : ", myRoom)
        }
      })
    } else {
      try {
        redisClient.get(myRoom, (err, viewers) => {
          if (!err) {
            viewers = JSON.parse(viewers)
            const i = viewers.findIndex((viewer) => viewer?.unAuthed === true)
            if (i >= 0) {
              viewers.splice(i, 1)
            }
          } else {
            console.error(
              "Redis get Error un-authed viewer leaving stream",
              err
            )
          }
          redisClient.set(myRoom, JSON.stringify(viewers), (err) => {
            if (err) {
              console.error(
                "Redis set Error un-authed viewer leaving stream",
                err
              )
            }
            io.getIO()
              .in(`${client.streamId}-public`)
              .emit(chatEvents.viewer_left_received, {
                roomSize: io.getIO().sockets.adapter.rooms.get(myRoom)?.size,
              })
            // callBack()
          })
        })
      } catch (err) {
        /* err */
        console.error("Redis error : ", err)
      }
    }
  }

  client.on("take-me-out-of-these-rooms", (rooms) => {
    try {
      for (let i = 0; i < rooms.length; i++) {
        const myRoom = rooms[i]
        if (myRoom.endsWith("-public")) {
          client.leave(myRoom)
          client.in(myRoom).emit(chatEvents.viewer_left_received, {
            roomSize: io.getIO().sockets.adapter.rooms.get(myRoom)?.size,
            relatedUserId: client.data?.relatedUserId || undefined,
          })
          /* free data keys */
          delete client.onStream
          delete client.streamId

          /**
           * remove and update viewer list redis
           */
          handleRedisCleanUp(client, myRoom)
        }
      }
    } catch (err) {
      /**
       * can be unauthed handler also, hence no relatedUserId
       */
      console.error("Error while leaving a room ", err)
      console.error("relatedUserId ", client?.data?.relatedUserId)
      console.error("userType ", client.userType)
    }
  })
}
