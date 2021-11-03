const express = require("express")
const mongoose = require("mongoose")
require("dotenv").config()
const app = express()
app.use(express.json())
const socket = require("./socket")
const socketMiddlewares = require("./utils/socket/socketMiddleware")
const socketListeners = require("./utils/socket/socketEventListeners")
const chatEventListeners = require("./utils/socket/chat/chatEventListeners")
const { instrument } = require("@socket.io/admin-ui")
// const cookieParser = require("cookie-parser");
const path = require("path")
app.use(express.static(__dirname + "/images"))
app.use("/images/gifts", express.static(__dirname + "/images/gifts"))
app.use("/images/model", express.static(__dirname + "/images/model"))

/* SSL setup */
const https = require("https")
const fs = require("fs")
const host = "192.168.1.104"
const sslOptions = {
  key: fs.readFileSync("./192.168.1.104-key.pem"),
  cert: fs.readFileSync("./192.168.1.104.pem"),
}

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

// 🔴 ADMIN ROUTES 🔴
const adminPermissions = require("./routes/ADMIN/permissions")
const adminGiftRoutes = require("./routes/ADMIN/gifts")

// Required Models
const AudioCall = require("./models/globals/audioCall")
const VideoCall = require("./models/globals/videoCall")
const socketEvents = require("./utils/socket/socketEvents")
const Viewer = require("./models/userTypes/Viewer")
const Model = require("./models/userTypes/Model")

// CONNECT-URL--->
let CONNECT_URL
if (process.env.HOSTED_DB === "true") {
  CONNECT_URL = `mongodb+srv://${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_USER}:${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_PASS}@nodejs.fsqgg.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
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
app.use("/api/website/role", roleRouter)
app.use("/api/website/register/viewer", viewerRouter)
app.use("/api/website/register/model", modelRouter)
app.use("/api/website/register/superadmin", superAdminRouter)
app.use("/api/website/login", globalLoginRoutes)
app.use("/api/website/compose-ui", uxUtils)
// category is Depreciated, will now use Tag-group and tags
// app.use("/api/website/management/category", categoryRoutes)
app.use("/api/website/management/tags", tagRouter)
app.use("/api/website/token-builder", tokenBuilderRouter)
app.use("/api/website/gifts", giftsRouter)
app.use("/api/website/stream", streamRouter)

// ADMIN PATHS
app.use("/api/admin/permissions", adminPermissions)
app.use("/api/admin/gifts", adminGiftRoutes)
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
  })
  .then(() => {
    console.log("============== CONNECTED TO MongoDB =============")
    const server = https.createServer(sslOptions, app)

    // const server = app.listen(process.env.PORT || 8080, () =>
    //   console.log("Listening on : " + process.env.PORT)
    // )
    const socketOptions = {
      cors: {
        origin: "*",
        methods: "*",
      },
    }
    const io = socket.init(server, socketOptions)
    instrument(io, {
      auth: false,
    })

    server.listen(process.env.PORT || 8080, () =>
      console.log("Listening on : " + process.env.PORT)
    )

    // example of socket middleware 👇👇
    io.use(socketMiddlewares.verifyToken)
    io.use(socketMiddlewares.pendingCallResolver)
    // io.use((client, next) => {
    //   console.log("Putted socket on hold")
    //   setTimeout(() => {
    //     next()
    //   }, 5000)
    // })
    io.on("connection", (client) => {
      client.on("putting-me-in-these-rooms", (rooms, callback) => {
        console.log("put in rooms >> ", rooms)

        /* have to check valadity of these rooms
          these rooms must exist beforehand in order to be joined by the user or not 🤔🤔
          👇👇 below is problem
        */

        // ⭕⭕
        // if (client.userType === "UnAuthedViewer") {
        //   console.log("client data >>>", client.userType)
        //   if (rooms.length > 1) {
        //     throw new Error("UnAuthedViewer joining more rooms!")
        //   }
        //   rooms.forEach((room) => {
        //     client.join(room)
        //   })
        //   callback({
        //     status: "ok",
        //   })
        // } else {
        rooms.forEach((room) => {
          client.join(room)
        })
        callback({
          status: "ok",
        })
        // }
      })

      client.on("take-me-out-of-these-rooms", (rooms, callback) => {
        console.log("leave rooms >> ", rooms)
        rooms.forEach((room) => {
          client.leave(room)
        })
        callback({
          status: "ok",
        })
      })

      console.log("New Connection", client.id, client.data, client.userType)
      if (client.userType === "UnAuthedViewer") {
        chatEventListeners.unAuthedViewerListeners(client)
      } else if (client.userType === "Viewer") {
        chatEventListeners.authedViewerListeners(client)
      } else if (client.userType === "Model") {
        chatEventListeners.modelListeners(client)
      }
      // socketListeners(client)
    })
    // example of room events 👇👇
    io.of("/").adapter.on("join-room", (room, socketId) => {
      console.log("someone joined a room")
      io.sockets.sockets.get(socketId).emit("you-joined-a-room", room)
    })

    io.of("/").adapter.on("leave-room", (room, socketId) => {
      io.sockets.sockets.get(socketId).emit("you-left-a-room", room)
    })
  })
  .catch((err) => console.log(err))

/*   switch (client.userType) {
    case "unAuthedUser":

      break;
    case "Viewer":

      break;
    case "Model":

      break;

    default:
      break;
  } */
