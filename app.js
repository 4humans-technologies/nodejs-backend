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
const {
  generatePublicUploadUrl,
  deleteObjectFromS3,
} = require("./utils/aws/s3")
app.use(express.static(__dirname + "/images"))
app.use("/images/gifts", express.static(__dirname + "/images/gifts"))
app.use("/images/model", express.static(__dirname + "/images/model"))

/* SSL setup */
const https = require("https")
const fs = require("fs")
const sslOptions = {
  key: fs.readFileSync("./localhost-key.pem"),
  cert: fs.readFileSync("./localhost.pem"),
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
const privateChatsRouter = require("./routes/stream/privateChatsRoute")
const modelProfileRouter = require("./routes/profile/modelProfile")
const couponRouter = require("./routes/management/coupon")

// 🔴 ADMIN ROUTES 🔴
const adminPermissions = require("./routes/ADMIN/permissions")
const adminGiftRoutes = require("./routes/ADMIN/gifts")
const privateChatRouter = require("./routes/ADMIN/privateChat")
const couponAdminRouter = require("./routes/ADMIN/couponRoutes")

// Required Models
const socketEvents = require("./utils/socket/socketEvents")
const Viewer = require("./models/userTypes/Viewer")
const Model = require("./models/userTypes/Model")
const Stream = require("./models/globals/Stream")
const AudioCall = require("./models/globals/audioCall")
const VideoCall = require("./models/globals/videoCall")

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
app.use("/api/website/private-chat", privateChatsRouter)
app.use("/api/website/profile", modelProfileRouter)
app.use("/api/website/coupon", couponRouter)

/* aws setup */
app.get("/api/website/aws/get-s3-upload-url", (req, res, next) => {
  const { type } = req.query
  if (!type) {
    res.status(400).json({
      actionStatus: failed,
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
    // const server = https.createServer(sslOptions, app)

    const server = app.listen(process.env.PORT || 8080, () =>
      console.log("Listening on : " + process.env.PORT)
    )
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

    // server.listen(process.env.PORT || 8080, () =>
    //   console.log("Listening on : " + process.env.PORT)
    // )

    // example of socket middleware 👇👇
    io.use(socketMiddlewares.verifyToken)
    // io.use(socketMiddlewares.pendingCallResolver)

    io.on("connection", (client) => {
      if (client.handshake.query.userType === "Model") {
        client.join(`${client.data.relatedUserId}-private`)
      }
      client.on("disconnect", () => {
        if (client?.isStreaming && client.authed) {
          /**
           * client (model) disconnected in between of the stream
           */
          try {
            console.log("🚩 a model left in between of streaming")
            Stream.findById(client.streamId)
              .then((stream) => {
                const duration =
                  (Date.now() - new Date(stream.createdAt).getTime()) / 1000
                stream.endReason =
                  "tab-close | window-reload | connection-error"
                stream.status = "ended"
                stream.duration = duration
                return Promise.all([
                  stream.save(),
                  Model.updateOne(
                    { _id: client.data.relatedUserId },
                    {
                      isStreaming: false,
                      currentStream: null,
                    }
                  ),
                ])
              })
              .then((values) => {
                const stream = values[0]
                client.broadcast.emit(socketEvents.deleteStreamRoom, {
                  modelId: client.data.relatedUserId,
                })

                /* destroy the stream chat rooms */
                io.in(`${client.streamId}-public`).socketsLeave(
                  `${client.streamId}-public`
                )
                io.in(`${client.data.relatedUserId}-private`).socketsLeave(
                  `${client.data.relatedUserId}-private`
                )
                client.isStreaming = false
                client.currentStream = null
              })
          } catch (error) {
            /* log that stream was not closed */
            console.warn("The streaming status was not updated(closed)")
          }
        } else if (client?.onCall && !client.authed) {
          if ((client.userType = "Model")) {
            const callId = client.callId
            const callType = client.callType

            /*  */
            let theCall
            let modelWallet
            let amountToDeduct
            let amountAdded
            let viewerWallet

            const initialQuery =
              callType === "audioCall"
                ? AudioCall.updateOne(
                    {
                      _id: callId,
                    },
                    {
                      $addToSet: { concurrencyControl: 1 },
                    }
                  )
                : VideoCall.updateOne(
                    {
                      _id: callId,
                    },
                    {
                      $addToSet: { concurrencyControl: 1 },
                    }
                  )

            initialQuery
              .then((result) => {
                if (result.n === 0) {
                  /* no doc modified, model has ended tha call faster, return */
                  res.status(200).json({
                    actionStatus: "failed",
                    wasFirst: "no" /* was first to put the call end request */,
                    message:
                      "viewer ended call before you, please wait while we are processing the transaction!",
                  })
                } else if (result.n > 0) {
                  /* you have locked the db model cannot over-rite */
                  const query =
                    callType === "audioCall"
                      ? Promise.all([
                          AudioCall.findById(callId),
                          Wallet.findOne({
                            relatedUser: req.user.relatedUser._id,
                          }),
                        ])
                      : Promise.all([
                          VideoCall.findById(callId),
                          Wallet.findOne({
                            relatedUser: req.user.relatedUser._id,
                          }),
                        ])
                  return query
                }
              })
              .then((values) => {
                theCall = values[0]
                modelWallet = values[1]
                if (theCall.endTimeStamp) {
                  /* return bro */
                  const error = new Error(
                    "call doc updated even after locking, this should be impossible"
                  )
                  error.statusCode = 500
                  throw error
                } else {
                  /* do the money transfer logic */
                  theCall.endTimeStamp = endTimeStamp
                  const totalCallDuration =
                    (+endTimeStamp - theCall.startTimeStamp) /
                    60000 /* convert milliseconds to seconds */
                  if (totalCallDuration <= theCall.minCallDuration) {
                    amountToDeduct = 0
                  } else {
                    const billableCallDuration = Math.ceil(
                      totalCallDuration - theCall.minCallDuration
                    ) /* in minutes */
                    amountToDeduct = billableCallDuration * theCall.chargePerMin
                  }
                  amountAdded =
                    amountToDeduct * (req.user.relatedUser.sharePercent / 100)
                  modelWallet.addAmount(amountAdded)
                  /* for admin account */
                  // adminWallet.addAmount(amountToDeduct * ((100 - sharePercent) / 100))
                  return Promise.all([
                    modelWallet.save(),
                    theCall.save(),
                    Wallet.findOne({ relatedUser: theCall.viewer._id }),
                  ])
                }
              })
              .then((values) => {
                /* assign the latest values to theCall */
                theCall = values[1]
                viewerWallet = values[2]
                viewerWallet.deductAmount(amountToDeduct)
                return viewerWallet.save()
              })
              .then((wallet) => {
                /* now remove the pending calls from model & viewer */
                const viewerPr = Viewer.findOneAndUpdate(
                  {
                    _id: theCall.viewer._id,
                  },
                  {
                    pendingCall: null,
                  }
                )
                  .select("name rootUser profileImage")
                  .populate({
                    path: "rootUser",
                    select: "username",
                  })
                  .lean()
                let modelPr

                if (callType === "audioCall") {
                  modelPr = Model.findOneAndUpdate(
                    {
                      _id: theCall.model._id,
                    },
                    {
                      $pull: {
                        "pendingCalls.audioCalls": theCall._id,
                      },
                    },
                    { runValidators: true }
                  )
                    .select("name rootUser profileImage")
                    .populate({
                      path: "rootUser",
                      select: "username",
                    })
                    .lean()
                } else {
                  modelPr = Model.findOneAndUpdate(
                    {
                      _id: theCall.model._id,
                    },
                    {
                      $pull: { "pendingCalls.videoCalls": theCall._id },
                    },
                    { runValidators: true }
                  )
                    .select("name rootUser profileImage")
                    .populate({
                      path: "rootUser",
                      select: "username",
                    })
                    .lean()
                }

                return Promise.all([viewerPr, modelPr])
              })
              .then((values) => {
                const viewer = viewer
                const model = values[1]

                if (viewer._id && model._id) {
                  io.getIO()
                    .in(`${theCall.stream._id.toString()}-public`)
                    .emit(chatEvents.model_call_end_request_finished, {
                      theCall: theCall,
                      callDuration: (theCall.startTimeStamp =
                        theCall.endTimeStamp),
                      callType: theCall.callType,
                      name: req.user.relatedUser.name,
                      username: req.user.username,
                      profileImage: req.user.relatedUser.profileImage,
                      dateTime: theCall.startedAt,
                      currentAmount: viewerWallet.currentAmount,
                      amountDeducted: amountToDeduct,
                      ended: "ok",
                    })
                  /* clear client */

                  clientSocket.onCall = false
                  client.callId = null
                  clientSocket.callType = null

                  res.status(200).json({
                    // theCall: theCall,
                    callDuration: (theCall.startTimeStamp =
                      theCall.endTimeStamp),
                    callType: theCall.callType,
                    name: viewer.name,
                    dateTime: theCall.startedAt,
                    currentAmount: modelWallet.currentAmount,
                    amountAdded: amountAdded,
                    totalCharges: amountToDeduct,
                    actionStatus: "success",
                    message: "call was ended successfully",
                    wasFirst: "yes" /* was first to put the call end request */,
                  })
                } else {
                  const error = new Error(
                    "pending calls were not removed successfully"
                  )
                  error.statusCode = 500
                  throw error
                }
              })
              .catch((err) => next(err))
          } else {
          }
        }
      })

      client.on("putting-me-in-these-rooms", (rooms, callback) => {
        console.log("put in rooms >> ", rooms)
        if (client.userType === "UnAuthedViewer") {
          if (rooms.length === 1 && rooms[0].endsWith("-public")) {
            /* un-authed user can only join public room */
            client.join(rooms[0])
            callback({
              status: "ok",
            })
          }
        } else if (client.authed) {
          for (let i = 0; i < rooms.length; i++) {
            if (rooms[i].endsWith("-private")) {
              if (rooms[i] === `${client.data.relatedUserId}-private`) {
                /* join his private room */
                client.join(rooms[i])
              }
              /* else joining "someone-"elses" room */
            } else if (rooms[i].endsWith("-private")) {
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

      console.log("👉", client.id, client.userType)
      if (client.userType === "UnAuthedViewer") {
        chatEventListeners.unAuthedViewerListeners(client)
      } else if (client.userType === "Viewer") {
        chatEventListeners.authedViewerListeners(client)
      } else if (client.userType === "Model") {
        chatEventListeners.modelListeners(client)
      }
      // socketListeners(client)
    })

    io.of("/").adapter.on("join-room", (room, socketId) => {
      console.log("someone joined a room >>", room)
      if (room.endsWith("-public") || room.endsWith("-private")) {
        io.sockets.sockets.get(socketId).emit("you-joined-a-room", room)
      }
    })

    io.of("/").adapter.on("leave-room", (room, socketId) => {
      console.log("someone left a room >>", room)
      if (room.endsWith("-public") || room.endsWith("-private")) {
        io.sockets.sockets.get(socketId).emit("you-left-a-room", room)
      }
    })
  })
  .catch((err) => console.log(err))
