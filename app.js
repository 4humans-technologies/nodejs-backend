const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const app = express()
const cookieParser = require("cookie-parser")
app.use(express.json())
const socket = require("./socket")
const socketMiddlewares = require("./utils/socket/socketMiddleware")
const socketListeners = require("./utils/socket/socketEventListeners")

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
const tagRouter = require("./routes/management/tagRoutes");
const uxUtils = require("./routes/uxUtils/uxUtilsRoutes");

// 🔴 ADMIN ROUTES 🔴
const adminPermissions = require("./routes/ADMIN/permissions");
h
const AudioCall = require("./models/globals/audioCall");
const VideoCall = require("./models/globals/videoCall");
const socketEvents = require("./utils/socket/socketEvents");
const Viewer = require("./models/userTypes/Viewer");
const Model = require("./models/userTypes/Model");

// CONNECT-URL--->
let CONNECT_URL;
if (process.env.HOSTED_DB === "true") {
    CONNECT_URL = `mongodb+srv://${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_USER}:${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_PASS}@nodejs.fsqgg.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
} else {
    CONNECT_URL = `mongodb://192.168.1.104:27017/${process.env.DB_NAME}`;
}

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "PUT, GET, POST, DELETE, OPTIONS"
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    next();
});

// ALL HTTP ROUTES--->
app.use("/api/website/permissions", permissionRouter);
app.use("/api/website/role", roleRouter);
app.use("/api/website/register/viewer", viewerRouter);
app.use("/api/website/register/model", modelRouter);
app.use("/api/website/register/superadmin", superAdminRouter);
app.use("/api/website/login", globalLoginRoutes);
app.use("/api/website/compose-ui", uxUtils);
// category is Depreciated, will now use Tag-group and tags
// app.use("/api/website/management/category", categoryRoutes)
app.use("/api/website/management/tags", tagRouter)
app.use("/api/website/token-builder", tokenBuilderRouter)
app.use("/api/admin/permissions", adminPermissions)
app.use("/test", testRouter)


// EXPRESS ERROR HANDLER--->
app.use((err, req, res, next) => {
    console.log(err, err.statusCode, err.status, err.data)
    if (!err.statusCode) {
        res.status(500).json({
            message: err.message || "error",
            actionStatus: err.actionStatus || "failed",
            data: err.data || ""
        })
    } else {
        res.status(err.statusCode).json({
            message: err.message || "error",
            actionStatus: err.actionStatus || "failed",
            data: err.data || ""
        })
    }
    next()
})


// MONGODB CONNECTION SETUP--->
// mongoose.set("debug",true)
mongoose.connect(
    CONNECT_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
    }
).then(() => {
    console.log('============== CONNECTED TO MongoDB =============');

    const server = app.listen(process.env.PORT || 8080, () => console.log('Listening on : ' + process.env.PORT))
    const socketOptions = {
        cors: {
            origin: "*",
            methods: "*"
        }

    }
    const io = socket.init(server, socketOptions)

    // example of socket middleware 👇👇
    io.use(socketMiddlewares.verifyToken)
    io.on("connection", client => {
        socket.setClientSocket(client)
        console.log("New Connection", client.data, client.userType);
        /**
         * check for pending call
         */
        if (client.handshake.query.hasAudioCall || client.handshake.query.hasVideoCall) {
            /**
             * check for authed status
             */
            if (client.authed) {
                if (client.userType === "Viewer" || "UnAuthedViewer") {
                    /**
                     * if viewer
                     */
                    Viewer.findById(client.data.relatedUserId)
                        .select("pendingCall name")
                        .populate("pendingCall")
                        .lean()
                        .then(viewer => {
                            if (viewer.pendingCall) {
                                client.join(viewer.pendingCall._id)
                                io.to(viewer.pendingCall._id).emit(socketEvents.canAudiCallUsersConnectedAgain, { callId: viewer.pendingCall._id, name: viewer.name, callType: viewer.pendingCall.callType })
                            }
                        })
                } else if (client.userType === "Model") {
                    /**
                     * if Model
                     */
                    Model.findById(client.data.relatedUserId)
                        .select("pendingCalls name profileImage")
                        .populate({
                            path: "pendingCalls",
                            populate: {
                                path: "audioCalls",
                                model: "AudioCall",
                                select: "viewer"
                            },
                            populate: {
                                path: "videoCalls",
                                model: "VideoCall",
                                select: "viewer"
                            },
                        })
                        .lean()
                        .then(model => {
                            if (model.pendingCalls.audioCalls || model.pendingCalls.videoCalls) {
                                /** Remember that it is expected in 99% of the case, this will not be required for the call */
                                /** create and join channel for each call */
                                /** also check if any one is online  */
                                const onlineUsers = []
                                model.pendingCalls.audioCalls.forEach(call => {
                                    client.join(call._id)
                                    io.to(call._id).emit(socketEvents.canAudiCallUsersConnectedAgain, { callId: call._id, name: model.name, callType: "audioCall", profileImage: model.profileImage })
                                    if (io.sockets.adapter.rooms.get(call._id).size !== 1) {
                                        /**if room size greater than one, then the viewer is also connected */
                                        onlineUsers.push(call.viewer)
                                    }
                                })
                                model.pendingCalls.videoCalls.forEach(call => {
                                    client.join(call._id)
                                    io.to(call._id).emit(socketEvents.canAudiCallUsersConnectedAgain, { callId: call._id, name: model.name, callType: "audioCall", profileImage: model.profileImage })
                                    if (io.sockets.adapter.rooms.get(call._id).size !== 1) {
                                        /**if room size greater than one, then the viewer is also connected */
                                        onlineUsers.push(call.viewer)
                                    }
                                })
                            }
                        })
                }
            }
        }
        // setup socket listeners
        socketListeners(client)
    })

    // example of room events 👇👇
    // io.of("/").adapter.on("create-room", (room) => {
    //     console.log(`room ${room} was created`);
    // })
})
    .catch(err => console.log(err))

