require("dotenv").config()
require("./firebase")
const mongoose = require("mongoose")
const redisClient = require("./redis")
const express = require("express")
const socket = require("./socket")
const app = express()
const socketMiddlewares = require("./utils/socket/socketMiddleware")
const chatEventListeners = require("./utils/socket/chat/chatEventListeners")
const onDisconnectStreamEndHandler = require("./utils/socket/disconnect/streamEndHandler")
const onDisconnectCallEndHandler = require("./utils/socket/disconnect/callEndHandler")
const updateClientInfo = require("./utils/socket/updateClientInfo")
const {
  generatePublicUploadUrl,
  generatePrivateContentTwinUploadUrl,
} = require("./utils/aws/s3")
const requestRoomHandlers = require("./utils/socket/requestedRoomHandlers")
const verificationRouter = require("./routes/management/verificationRoutes")
const { viewer_left_received } = require("./utils/socket/chat/chatEvents")
const {
  callHasEnded,
  deleteStreamRoom,
} = require("./utils/socket/socketEvents")
const Model = require("./models/userTypes/Model")
if (process.env.RUN_ENV == "windows") {
  app.use(express.static(__dirname + "/images"))
  app.use("/images/gifts", express.static(__dirname + "/images/gifts"))
  app.use("/images/model", express.static(__dirname + "/images/model"))
}
app.use(express.json())

// ❌❌❌❌
/**
 * create new agora project for dreamgirl
 * previous one's cred's may have been leaked
 * ------
 * escape user inputs also
 */
// ❌❌❌❌

// 🔴 WEBSITE ROUTER 🔴
const permissionRouter = require("./routes/rbac/permissionRoutes")
const roleRouter = require("./routes/rbac/roleRoutes")
const viewerRouter = require("./routes/register/viewerRoutes")
const modelRouter = require("./routes/register/modelRoutes")
const superAdminRouter = require("./routes/register/superadminRoutes")
const globalLoginRoutes = require("./routes/login/globalLoginRoutes")
const tokenBuilderRouter = require("./routes/agora/tokenBuilderRoutes")
const testRouter = require("./routes/test/test")
// category is Depreciated, will now use Tag-group and tags
// const categoryRoutes = require("./routes/management/categoryRoutes")
const tagRouter = require("./routes/management/tagRoutes")
const uxUtilsRoutes = require("./routes/uxUtils/uxUtilsRoutes")
const giftsRouter = require("./routes/gifts/gifts")
const streamRouter = require("./routes/stream/streamRoutes")
const privateChatsRouter = require("./routes/stream/privateChatsRoute")
const privateContentRouter = require("./routes/stream/PrivateContent")
const modelProfileRouter = require("./routes/profile/modelProfile")
const viewerProfileRouter = require("./routes/profile/viewerProfile")
const couponRouter = require("./routes/management/coupon")

// 🔴 ADMIN ROUTES 🔴
const adminPermissions = require("./routes/ADMIN/permissions")
const adminGiftRoutes = require("./routes/ADMIN/gifts")
const privateChatRouter = require("./routes/ADMIN/privateChat")
const couponAdminRouter = require("./routes/ADMIN/couponRoutes")

// ra-admin routes
const getLists = require("./routes/ADMIN/ra-admin/get/getLists")
const getOne = require("./routes/ADMIN/ra-admin/get/getOne")
const create = require("./routes/ADMIN/ra-admin/create/create")
const updateOne = require("./routes/ADMIN/ra-admin/update/updateOne")
const deleteHandlers = require("./routes/ADMIN/ra-admin/delete/delete")
const adminAuth = require("./routes/ADMIN/ra-admin/auth/auth")

// CONNECT-URL--->
if (process.env.LOCAL_DB === "false") {
  // these were the creds for Digital ocean database .👇👇
  // var CONNECT_URL = `mongodb+srv://${process.env.DO_MONGO_USER}:${process.env.DO_MONGO_PASS}@dreamgirl-mongodb-3node-blr-1-c5185824.mongo.ondigitalocean.com/${process.env.DO_MONGO_DB_NAME}?authSource=${process.env.DO_MONGO_AUTH_SOURCE}&replicaSet=${process.env.DO_MONGO_REPLICA_SET}&ssl=true`

  // var CONNECT_URL = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.acfgh.mongodb.net/${process.env.DB_NAME}?w=majority`

  // var CONNECT_URL = `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.acfgh.mongodb.net/${process.env.DB_NAME}?w=majority`

  // this is the first atlas db which
  var CONNECT_URL = `mongodb+srv://${process.env.DO_MONGO_USER}:${process.env.DO_MONGO_PASS}@cluster0.btitm.mongodb.net/${process.env.DO_MONGO_DB_NAME}`
} else {
  // CONNECT_URL = `mongodb://192.168.1.104:27017/${process.env.DB_NAME}`;
  // CONNECT_URL = `mongodb://localhost:27017/${process.env.DB_NAME}`

  CONNECT_URL = `mongodb+srv://${process.env.DO_MONGO_USER}:${process.env.DO_MONGO_PASS}@cluster0.btitm.mongodb.net/${process.env.DO_MONGO_DB_NAME}`
}

app.use((req, res, next) => {
  if (process.env.RUN_ENV === "windows") {
    res.setHeader("Access-Control-Allow-Origin", "*")
  } else {
    const allowedOrigins = ["http://localhost:3000", "http://localhost:3001","https://www.tuktuklive.com","https://tuktuklive.com","https://secure-administration.tuktuklive.com"]
    const origin = req.headers.origin

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".ngrok.io") ||
      origin.endsWith("dreamgirllive.co.in")
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin)
    }
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "PUT, GET, POST, DELETE, OPTIONS"
  )
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,range"
  )
  res.setHeader("Access-Control-Expose-Headers", "Content-Range")
  return next()
})

// ALL HTTP ROUTES--->
app.use("/api/website/permissions", permissionRouter)
app.use("/api/website/register/viewer", viewerRouter)
app.use("/api/website/register/model", modelRouter)
app.use("/api/website/login", globalLoginRoutes)
app.use("/api/website/compose-ui", uxUtilsRoutes)
// category is Depreciated, will now use Tag-group and tags
// app.use("/api/website/management/category", categoryRoutes)
app.use("/api/website/management/tags", tagRouter)
app.use("/api/website/token-builder", tokenBuilderRouter)
app.use("/api/website/gifts", giftsRouter)
app.use("/api/website/stream", streamRouter)
app.use("/api/website/stream/private-chat", privateChatsRouter)
app.use(
  "/api/website/stream/private-content",
  privateContentRouter
) /* private album buy/sell */
app.use("/api/website/profile", modelProfileRouter)
app.use("/api/website/profile/viewer", viewerProfileRouter)
app.use("/api/website/coupon", couponRouter)
app.use("/api/website/verification", verificationRouter)

/* ip address blockage workaround */
app.get("/api/website/get-geo-location", (req, res) => {
  return res.status(200).json({
    regionName: "delta",
  })
})

/* get-s3-upload-url */
app.get("/api/website/aws/get-s3-upload-url", (req, res, next) => {
  const { type } = req.query
  if (!type) {
    return res.status(400).json({
      actionStatus: "failed",
      message: "Type not provide in the query parameter, it's required",
    })
  }
  const extension = "." + type?.split("/")[1]
  return generatePublicUploadUrl(extension, type)
    .then((s3UrlData) => {
      return res.status(200).json({
        uploadUrl: s3UrlData.uploadUrl,
        key: s3UrlData.key,
      })
    })
    .catch((err) => next(err))
})

/* generate upload url for private images/videos upload */
app.get(
  "/api/website/aws/get-s3-model-private-content-upload-url",
  (req, res, next) => {
    const { type, albumId, albumType } = req.query
    /**
     * should check if the model owns this album
     */
    if (!type) {
      return res.status(400).json({
        actionStatus: "failed",
        message: "Type not provide in the query parameter, it's required",
      })
    }
    const extension = "." + type?.split("/")[1]
    generatePrivateContentTwinUploadUrl(extension, type, albumId, albumType)
      .then((s3UrlData) => {
        return res.status(200).json({
          uploadUrl: s3UrlData.uploadUrls,
          key: s3UrlData.key,
        })
      })
      .catch((err) => next(err))
  }
)

/**
 * Modify models in the database
 */

// app.get(
//   "/this-url-is-for-running-my-custom-script-for-database-updates/random-str-1/random-str-2",
//   (req, res, next) => {
//     Model.find()
//       .then((models) => {
//         const modelPrs = []
//         models.forEach((model) => {
//           model.welcomeMessage = "Hello __name__ welcome to my stream 💕💕"
//           modelPrs.push(model.save())
//         })
//         return Promise.all(modelPrs)
//       })
//       .then((models) => {
//         console.log("All models updated successfully")
//         return res.status(200).json(models)
//       })
//       .catch((err) => {
//         return next(err)
//       })
//   }
// )

// ADMIN PATHS
/* 🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻 */
app.use("/api/admin/superadmin", superAdminRouter)
/* 🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺 */
app.use("/api/admin/permissions", adminPermissions)
app.use("/api/admin/gifts", adminGiftRoutes)
app.use("/api/admin/privatechat", privateChatRouter)
app.use("/api/admin/coupon", couponAdminRouter)
app.use("/api/admin/role", roleRouter)

// ra-admin
app.use("/api/admin/dashboard", getOne)
app.use("/api/admin/dashboard", getLists)
app.use("/api/admin/dashboard", create)
app.use("/api/admin/dashboard", updateOne)
app.use("/api/admin/dashboard", deleteHandlers)
app.use("/api/admin/nocrud/auth", adminAuth)

app.use("/test", testRouter)

// EXPRESS ERROR HANDLER--->
app.use((err, req, res, next) => {
  if (process.env.RUN_ENV === "windows") {
    console.log(err, err.statusCode, err.status, err.data)
  }
  if (!err.statusCode) {
    res.status(500).json({
      message: err.message || "error",
      actionStatus: err.actionStatus || "failed",
      data: err.data || "",
    })
    return next()
  } else {
    res.status(err.statusCode).json({
      message: err.message || "error",
      actionStatus: err.actionStatus || "failed",
      data: err.data || "",
    })
    return next()
  }
})

mongoose
  .connect(CONNECT_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
    tls: true,
    readConcern: "local",
    readPreference: process.env.DO_READ_PREFERENCE,
  })
  .then(() => {
    console.log("============== CONNECTED TO MongoDB =============")
    const server = app.listen(process.env.PORT || 8080, () =>
      console.log("Listening on : " + process.env.PORT)
    )
    const socketOptions = {
      cors: {
        origin: [
          "https://dreamgirllive.com",
          "https://www.dreamgirllive.com",
          "http://localhost:3000",
        ],
        methods: ["GET", "POST"],
      },
    }
    const io = socket.init(server, socketOptions)
    if (process.env.RUN_ENV === "windows") {
      const { instrument } = require("@socket.io/admin-ui")
      instrument(io, {
        auth: false,
      })
    }
    // server.listen(process.env.PORT || 8080, () =>
    //   console.log("Listening on : " + process.env.PORT)
    // )

    // example of socket middleware 👇👇
    io.use(socketMiddlewares.verifyToken)
    // io.use(socketMiddlewares.pendingCallResolver)

    io.on("connection", (client) => {
      /**
       * dont push this code in socket middleware it's causing weird behaviour
       * by putting there 🚩🚩
       */
      if (
        (client.userType === "Model" || client.userType === "Viewer") &&
        client.authed
      ) {
        client.join(
          `${client.data.relatedUserId}-private`
        ) /* 🌼🌼🌼 works here only */
      }

      try {
        client.on("disconnect", () => {
          if (client.userType === "Model") {
            if (client?.isStreaming && client.authed) {
              /* check if the disconnecting model was streaming */
              onDisconnectStreamEndHandler(client)
            } else if (client.authed && client?.onCall) {
              /* check if the disconnecting "USER" was on call */
              onDisconnectCallEndHandler(client)
            } else {
              /* force check in DB*/
              Model.findOneAndUpdate(
                {
                  _id: client.data.relatedUserId,
                },
                {
                  isStreaming: false,
                  onCall: false,
                  currentStream: undefined,
                }
              )
                .lean("isStreaming onCall currentStream")
                .then((result) => {
                  /* check is nModified */
                  const newCount = socket.decreaseLiveCount(
                    client.data.relatedUserId
                  )
                  /* if streaming, emit stream delete */
                  if (
                    result.isStreaming ||
                    socket.getLiveCount() - newCount > 0
                  ) {
                    client.emit(deleteStreamRoom, {
                      modelId: client.data.relatedUserId,
                      liveNow: newCount,
                    })
                  } else if (
                    result.onCall ||
                    socket.getLiveCount() - newCount > 0
                  ) {
                    client.emit(callHasEnded, newCount)
                  }
                })
                .catch((err) => {
                  console.error("Error while model disconnecting : ", err)
                })
            }
          } else if (client.authed && client?.onCall) {
            /* check if the disconnecting "USER" was on call */
            onDisconnectCallEndHandler(client)
          } else if (client.data?.onStream && client.data?.streamId) {
            /* if viewer was on a stream */
            const myRoom = `${client.data.streamId}-public`
            if (client.authed) {
              redisClient.get(myRoom, (err, viewers) => {
                if (err) {
                  console.error(
                    "Redis error while authed viewer leaving redis room"
                  )
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
                    socket
                      .getIO()
                      .in(myRoom)
                      .emit(viewer_left_received, {
                        roomSize: socket
                          .getIO()
                          .sockets.adapter.rooms.get(myRoom)?.size,
                        relatedUserId: client.data.relatedUserId,
                      })
                  })
                } else {
                  return console.error(
                    "No viewers in redis for room : ",
                    myRoom
                  )
                }
              })
            } else {
              try {
                redisClient.get(myRoom, (err, viewers) => {
                  if (!err && viewers) {
                    viewers = JSON.parse(viewers)
                    if (typeof viewers !== "object") {
                      console.error("viewers is not array ", viewers)
                    } else {
                      /* if viewers is an array */
                      const i = viewers.findIndex(
                        (viewer) => viewer?.unAuthed === true
                      )
                      if (i >= 0) {
                        viewers.splice(i, 1)
                      }
                      redisClient.set(
                        myRoom,
                        JSON.stringify(viewers),
                        (err) => {
                          if (err) {
                            console.error(
                              "Redis set Error un-authed viewer leaving stream",
                              err
                            )
                          }
                          socket
                            .getIO()
                            .in(`${client.data.streamId}-public`)
                            .emit(viewer_left_received, {
                              roomSize: socket
                                .getIO()
                                .sockets.adapter.rooms.get(myRoom)?.size,
                            })
                        }
                      )
                    }
                  } else {
                    console.error(
                      "Redis get Error un-authed viewer leaving stream",
                      err
                    )
                  }
                })
              } catch (err) {
                /* err */
                console.error("Redis error : ", err)
              }
            }
          }
        })
      } catch (err) {
        console.error("Error while processing socket disconnection")
        console.error("Error: ", err)
      }

      requestRoomHandlers(client)

      try {
        /* update client info on viewers request */
        updateClientInfo(client)
      } catch (err) {
        console.error("Error while updating client info!")
        console.error("Error: ", err)
      }

      client.on("error", (err) => {
        socket.emit("socket-err", err.message)
      })

      if (process.env.RUN_ENV === "windows") {
        console.log("👉", client.id, client.userType)
      }
      switch (client.userType) {
        case "Model":
          chatEventListeners.modelListeners(client)
          break
        case "Viewer":
          chatEventListeners.authedViewerListeners(client)
          break
        case "UnAuthedViewer":
          chatEventListeners.unAuthedViewerListeners(client)
          break
        default:
          break
      }
    })

    io.of("/").adapter.on("join-room", (room, socketId) => {
      if (room.endsWith("-public") || room.endsWith("-private")) {
        if (process.env.RUN_ENV === "windows") {
          console.log("someone joined a room >>", room)
        }
        io.sockets.sockets.get(socketId).emit("you-joined-a-room", room)
      }
    })

    io.of("/").adapter.on("leave-room", (room, socketId) => {
      if (room.endsWith("-public") || room.endsWith("-private")) {
        if (process.env.RUN_ENV === "windows") {
          console.log("someone left a room >>", room)
        }
        io.sockets.sockets.get(socketId).emit("you-left-a-room", room)
      }
    })
  })
  .catch((err) => console.log(err))
