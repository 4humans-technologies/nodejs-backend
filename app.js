require("dotenv").config()
const mongoose = require("mongoose")
const firebase = require("./firebase")
const express = require("express")
const socket = require("./socket")
const app = express()
const socketMiddlewares = require("./utils/socket/socketMiddleware")
const chatEventListeners = require("./utils/socket/chat/chatEventListeners")
const onDisconnectStreamEndHandler = require("./utils/socket/disconnect/streamEndHandler")
const onDisconnectCallEndHandler = require("./utils/socket/disconnect/callEndHandler")
const updateClientInfo = require("./utils/socket/updateClientInfo")
const { generatePublicUploadUrl } = require("./utils/aws/s3")
const requestRoomHandlers = require("./utils/socket/requestedRoomHandlers")

if (process.env.RUN_ENV !== "ubuntu") {
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
const uxUtils = require("./routes/uxUtils/uxUtilsRoutes")
const giftsRouter = require("./routes/gifts/gifts")
const streamRouter = require("./routes/stream/streamRoutes")
const privateChatsRouter = require("./routes/stream/privateChatsRoute")
const modelProfileRouter = require("./routes/profile/modelProfile")
const couponRouter = require("./routes/management/coupon")

// 🔴 ADMIN ROUTES 🔴
const adminPermissions = require("./routes/ADMIN/permissions")
const adminGiftRoutes = require("./routes/ADMIN/gifts")
const privateChatRouter = require("./routes/ADMIN/privateChat")
const couponAdminRouter = require("./routes/ADMIN/couponRoutes")

// CONNECT-URL--->
let CONNECT_URL
if (process.env.LOCAL_DB === "false") {
  CONNECT_URL = `mongodb+srv://${process.env.DO_MONGO_USER}:${process.env.DO_MONGO_PASS}@dreamgirl-mongodb-3node-blr-1-c5185824.mongo.ondigitalocean.com/${process.env.DO_MONGO_DB_NAME}?authSource=${process.env.DO_MONGO_AUTH_SOURCE}&replicaSet=${process.env.DO_MONGO_REPLICA_SET}&ssl=true`
  // CONNECT_URL = `mongodb+srv://${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_USER}:${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_PASS}@nodejs.fsqgg.mongodb.net/${process.env.DB_NAME}?w=majority`
} else {
  // CONNECT_URL = `mongodb://192.168.1.104:27017/${process.env.DB_NAME}`;
  CONNECT_URL = `mongodb://localhost:27017/${process.env.DB_NAME}`
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader(
    "Access-Control-Allow-Methods",
    "PUT, GET, POST, DELETE, OPTIONS"
  )
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization")
  next()
})

// ALL HTTP ROUTES--->
app.use("/api/website/permissions", permissionRouter)
app.use("/api/website/register/viewer", viewerRouter)
app.use("/api/website/register/model", modelRouter)
app.use("/api/website/login", globalLoginRoutes)
app.use("/api/website/compose-ui", uxUtils)
// category is Depreciated, will now use Tag-group and tags
// app.use("/api/website/management/category", categoryRoutes)
app.use("/api/website/management/tags", tagRouter)
app.use("/api/website/token-builder", tokenBuilderRouter)
app.use("/api/website/gifts", giftsRouter)
app.use("/api/website/stream", streamRouter)
app.use("/api/website/stream/private-chat", privateChatsRouter)
app.use("/api/website/profile", modelProfileRouter)
app.use("/api/website/coupon", couponRouter)

/* aws setup */
app.get("/api/website/aws/get-s3-upload-url", (req, res, next) => {
  const { type } = req.query
  if (!type) {
    res.status(400).json({
      actionStatus: "failed",
      message: "Type not provide in the query parameter, it's required",
    })
  }
  const extension = "." + type?.split("/")[1]
  generatePublicUploadUrl(extension, type)
    .then((s3UrlData) => {
      res.status(200).json({
        uploadUrl: s3UrlData.uploadUrl,
        key: s3UrlData.key,
      })
    })
    .catch((err) => next(err))
})

// ADMIN PATHS
/* 🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻🔻 */
/* comment after one time use */
/* should use script to use superadmin, via api is very dangerous */
// app.use("/api/admin/superadmin", superAdminRouter)
/* 🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺🔺 */
app.use("/api/admin/permissions", adminPermissions)
app.use("/api/admin/gifts", adminGiftRoutes)
app.use("/api/admin/privatechat", privateChatRouter)
app.use("/api/admin/coupon", couponAdminRouter)
app.use("/api/admin/role", roleRouter)

app.use("/test", testRouter)

// EXPRESS ERROR HANDLER--->
app.use((err, req, res, next) => {
  console.log(err, err.statusCode, err.status, err.data)
  if (!err.statusCode) {
    res.status(500).json({
      message: err.message || "error",
      actionStatus: err.actionStatus || "failed",
      data: err.data || "",
    })
  } else {
    res.status(err.statusCode).json({
      message: err.message || "error",
      actionStatus: err.actionStatus || "failed",
      data: err.data || "",
    })
  }
  next()
})

// MONGODB CONNECTION SETUP--->
// mongoose.set("debug",true)
mongoose
  .connect(CONNECT_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
    tls: true,
    tlsCAFile: "./ca-certificate.crt",
    readConcern: "local",
    writeConcern: {
      w: 1,
      j: false,
      wtimeout: 6000,
    },
    readPreference: process.env.DO_READ_PREFERENCE,
  })
  .then(() => {
    console.log("============== CONNECTED TO MongoDB =============")
    const server = app.listen(process.env.PORT || 8080, () =>
      console.log("Listening on : " + process.env.PORT)
    )
    const socketOptions = {
      cors: {
        origin: ["https://dreamgirllive.com", "http://localhost:3000"],
        methods: ["GET", "POST"],
      },
    }
    const io = socket.init(server, socketOptions)
    if (process.env.RUN_ENV !== "ubuntu") {
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
        (client.handshake.query.userType === "Model" ||
          client.handshake.query.userType === "Viewer") &&
        client.authed
      ) {
        client.join(
          `${client.data.relatedUserId}-private`
        ) /* 🌼🌼🌼 works here only */
      }

      client.on("disconnect", () => {
        if (
          client.userType === "Model" &&
          client?.isStreaming &&
          client.authed
        ) {
          /* check if the disconnecting model was streaming */
          onDisconnectStreamEndHandler(client)
        } else if (client.authed && client?.onCall) {
          /* check if the disconnecting "user" was on call */
          onDisconnectCallEndHandler(client)
        }
      })

      /* room handlers */
      requestRoomHandlers(client)

      /* update client info on viewers request */
      updateClientInfo(client)

      client.on("error", (err) => {
        socket.emit("socket-err", err.message)
      })

      console.log("👉", client.id, client.userType)
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
        console.log("someone joined a room >>", room)
        io.sockets.sockets.get(socketId).emit("you-joined-a-room", room)
      }
    })

    io.of("/").adapter.on("leave-room", (room, socketId) => {
      if (room.endsWith("-public") || room.endsWith("-private")) {
        console.log("someone left a room >>", room)
        io.sockets.sockets.get(socketId).emit("you-left-a-room", room)
      }
    })
  })
  .catch((err) => console.log(err))
