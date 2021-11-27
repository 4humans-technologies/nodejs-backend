const UnAuthedViewer = require("../../models/userTypes/UnAuthedViewer")
const controllerErrorCollector = require("../../utils/controllerErrorCollector")
const rtcTokenGenerator = require("../../utils/rtcTokenGenerator")
const Stream = require("../../models/globals/Stream")
const Model = require("../../models/userTypes/Model")
const { Types } = require("mongoose")
const Viewer = require("../../models/userTypes/Viewer")
const io = require("../../socket")
const socketEvents = require("../../utils/socket/socketEvents")
const { getDatabase } = require("firebase-admin/database")
const realtimeDb = getDatabase()

exports.createStreamAndToken = (req, res, next) => {
  // create stream and generate token for model
  // this end point will be called by the model

  controllerErrorCollector(req)
  const { socketId } = req.query

  let clientSocket = io.getIO().sockets.sockets.get(socketId)
  if (!clientSocket) {
    clientSocket = io
      .getIO()
      .sockets.sockets.get(
        Array.from(
          io
            .getIO()
            .sockets.adapter.rooms.get(`${req.user.relatedUser._id}-private`)
        )[0]
      )
  }

  // check if the model is approved or not,
  // by making a new model approval checker

  if (req.user.relatedUser.isStreaming) {
    /**
     * currently have skipped the on call check as the call ending mechanism is not reliably working
     */
    if (clientSocket?.isStreaming && clientSocket?.streamId) {
      /**
       * if model.isStreaming true and a client in private room
       * then the model is currently active and live streaming
       */
      return res.status(400).json({
        actionStatus: "failed",
        message:
          "You are streaming or on call, already from another device, streaming from two devices is not currently supported! 💻",
      })
    } else {
      /* the disconnection was not done properly the database entry of "model.isStreaming" was not updated
         but no problem go ahead and start streaming
      */
    }
  }

  let theStream, privilegeExpiredTs, rtcToken
  Stream({
    model: req.user.relatedUser._id,
    createdAt: new Date(),
  })
    .save()
    .then((stream) => {
      theStream = stream
      // 🤐🤐 ➡➡ will keep channel as modelID
      const genResult = rtcTokenGenerator(
        "model",
        req.user.relatedUser._id.toString(),
        req.user.relatedUser._id.toString()
      )
      privilegeExpiredTs = genResult.privilegeExpiredTs
      rtcToken = genResult.rtcToken
      const publicChats = realtimeDb
        .ref("publicChats")
        .child(theStream._id.toString())
      return publicChats.set({
        model: { ...req.user },
        chats: ["hello"],
      })
    })
    .then(() => {
      return Model.findOneAndUpdate(
        { _id: req.user.relatedUser._id },
        {
          isStreaming: true,
          currentStream: theStream._id,
          /* 👇👇 how to ensure same theStream is not added again */
          $addToSet: { streams: theStream },
        }
      )
        .writeConcern({
          w: 3,
          j: true,
        })
        .select("profileImage") /* for live updating of the landing page */
        .lean()
    })
    .then((model) => {
      // io.join(theStream._id)
      // everybody will get the notification of new stream
      /* 👉👉 return data so as to compose the complete card on the main page */

      const streamRoomPublic = `${theStream._id}-public`

      /* save data on client about the stream */
      clientSocket.isStreaming = true
      clientSocket.streamId = theStream._id.toString()
      clientSocket.join(streamRoomPublic)

      /* 👇👇 broadcast to all who are not in any room */
      // io.getIO().except(io.getIO().sockets.adapter.rooms)
      io.getIO().emit(socketEvents.streamCreated, {
        modelId: req.user.relatedUser._id,
        profileImage: model.profileImage,
        // streamId: theStream._id.toString(),
        liveNow: io.increaseLiveCount(),
      })

      return res.status(200).json({
        actionStatus: "success",
        rtcToken: rtcToken,
        privilegeExpiredTs: privilegeExpiredTs,
        streamId: theStream._id,
      })
    })
    .catch((err) => {
      Stream.deleteOne({ _id: theStream._id })
        .then((_) => next(err))
        .catch((_error) => next(err))
    })
}

exports.genRtcTokenViewer = (req, res, next) => {
  // for viewer who are loggedIn, and want to view model stream
  // just generate token and update stats
  controllerErrorCollector(req)

  const { modelId } = req.body
  const { socketId } = req.query

  const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
    "viewer",
    req.user.relatedUser._id.toString(),
    modelId
  )

  let theModel
  Model.findById(modelId)
    .select(
      "currentStream isStreaming onCall tags rating profileImage publicImages hobbies bio languages dob name gender ethnicity dynamicFields offlineStatus tipMenuActions charges"
    )
    .populate({
      path: "rootUser",
      select: "username",
    })
    .populate({
      path: "tags",
      select: "name",
    })
    .lean()
    .then((model) => {
      theModel = model
      if (model?.isStreaming) {
        /* 🔴 Dangerously 👆👆 removing currentstream check, only while developing */
        // if (model.isStreaming && model.currentStream) {
        const streamPr = Stream.updateOne(
          { _id: model.currentStream._id },
          {
            /* 👇 this make not mush sense to do whats the application of it */
            $addToSet: {
              viewers: Types.ObjectId(req.user.relatedUser._id),
            },
          },
          { new: true }
        )
        const viewerPr = Viewer.findOneAndUpdate(
          {
            _id: req.user.relatedUser._id,
          },
          {
            $addToSet: { streams: Types.ObjectId(model.currentStream._id) },
          }
        )
          .select(
            "isChatPlanActive currentChatPlan wallet audioCallHistory videoCallHistory streams gender following"
          )
          .populate("wallet")
          .lean()
        return Promise.all([streamPr, viewerPr])
          .then((values) => {
            const viewer = values[1]
            const streamRoom = `${theModel.currentStream._id}-public`

            let clientSocket = io.getIO().sockets.sockets.get(socketId)
            if (!clientSocket) {
              clientSocket = io
                .getIO()
                .sockets.sockets.get(
                  Array.from(
                    io
                      .getIO()
                      .sockets.adapter.rooms.get(
                        `${req.user.relatedUser._id}-private`
                      )
                  )[0]
                )
            }
            let puttedInRoom = false

            /* save data on client about the stream */
            try {
              clientSocket.onStream = true
              clientSocket.streamId = theModel.currentStream._id.toString()

              /* join the public chat room */
              clientSocket.join(streamRoom)
              /* deliberately making him rejoin just incase he has left the channel */
              clientSocket.join(`${req.user.relatedUser._id}-private`)

              const roomSize = io
                .getIO()
                .sockets.adapter.rooms.get(streamRoom)?.size

              /* emit to model with more viewer detail */
              io.getIO()
                .in(`${modelId}-private`)
                .emit(`${socketEvents.viewerJoined}-private`, {
                  roomSize: roomSize,
                  viewer: {
                    _id: req.user.relatedUser._id,
                    username: req.user.username,
                    name: req.user.relatedUser.name,
                    walletCoins: viewer.wallet.currentAmount,
                    profileImage: req.user.relatedUser.profileImage,
                    isChatPlanActive: viewer.isChatPlanActive,
                    // following: viewer.following.length,
                    // streams: viewer.streams.length,
                    // currentChatPlan: viewer.currentChatPlan,
                    // gender: viewer.gender,
                    // audioCallHistory: viewer.audioCallHistory.length,
                    // videoCallHistory: viewer.videoCallHistory.length,
                  },
                })

              /* emit in public room, with only room size */
              io.getIO().in(streamRoom).emit(socketEvents.viewerJoined, {
                roomSize: roomSize,
              })
              puttedInRoom = true
            } catch (err) {
              /* ======== */
              puttedInRoom = false
            }

            // http response
            return res.status(200).json({
              actionStatus: "success",
              rtcToken: rtcToken,
              privilegeExpiredTs: privilegeExpiredTs,
              streamId: theModel.currentStream._id,
              theModel: theModel,
              isChatPlanActive: viewer.isChatPlanActive,
              puttedInRoom: puttedInRoom,
            })
          })
          .catch((err) => next(err))
      } else {
        /* have to show offline screen */
        return res.status(200).json({
          actionStatus: "success",
          message: "model not streaming",
          theModel: theModel,
          isChatPlanActive: req.user.relatedUser.isChatPlanActive,
        })
      }
    })
}

exports.generateRtcTokenUnauthed = (req, res, next) => {
  controllerErrorCollector(req)
  // will run when unauthed user try to view models live stream, not when he enters the website
  // create unAuthed user and generate token
  const { modelId } = req.body
  const { socketId, unAuthedUserId } = req.query

  let theModel
  let puttedInRooms
  Model.findById(modelId)
    .select(
      "currentStream isStreaming onCall tags rating profileImage publicImages hobbies bio languages dob name gender ethnicity dynamicFields offlineStatus tipMenuActions charges"
    )
    .populate({
      path: "tags",
      select: "name",
    })
    .populate({
      path: "rootUser",
      select: "username",
    })
    .lean()
    .then((model) => {
      if (!model) {
        return Promise.reject("Invalid Url")
      }
      theModel = model
      if (model.isStreaming) {
        /* 🔴 Dangerously 👆👆 removing currentstream check, only while developing */
        // if (model.isStreaming && model.currentStream) {
        if (!unAuthedUserId && !req.user) {
          /**
           * means the un-authed user is untracked
           * create a new un-authed user
           */
          return UnAuthedViewer({
            sessions: 1,
            streamViewed: 1,
            lastStream: model.currentStream,
          })
            .save()
            .then((viewer) => {
              // generate twilio chat token as well
              const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                "unAuthed",
                viewer._id.toString(),
                model._id.toString()
              )
              //way1:👉 io.in(theSocketId).socketsJoin("room1");
              //way2:👉 io.sockets.sockets.get(socketId)

              const streamRoom = `${model.currentStream}-public`
              try {
                const clientSocket = io.getIO().sockets.sockets.get(socketId)

                /* add stream data on the client */
                clientSocket.onStream = true
                clientSocket.streamId = theModel.currentStream._id.toString()

                /* join the public room */
                clientSocket.join(streamRoom)
                const roomSize = io
                  .getIO()
                  .sockets.adapter.rooms.get(streamRoom)?.size

                /* emit to all to self also */
                io.getIO().in(streamRoom).emit(socketEvents.viewerJoined, {
                  roomSize: roomSize,
                })
                puttedInRooms = true
              } catch (err) {
                puttedInRooms = false
              }

              return res.status(200).json({
                actionStatus: "success",
                unAuthedUserId: viewer._id,
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
                newUnAuthedUserCreated: true,
                streamId: model.currentStream._id,
                theModel: theModel,
                puttedInRooms: puttedInRooms,
              })
            })
            .catch((err) => {
              throw err
            })
        }

        /**
         * means the un-authed user is already initialized
         * and being tracked
         */
        return UnAuthedViewer.findOneAndUpdate(
          { _id: unAuthedUserId },
          {
            $inc: {
              sessions: 1,
              streamViewed: 1,
            },
            lastAccess: new Date(),
            lastStream: model.currentStream,
          },
          { new: true }
        )
          .lean()
          .then((viewer) => {
            if (viewer) {
              const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                "unAuthed",
                viewer._id.toString(),
                model._id.toString()
              )

              const streamRoom = `${model.currentStream}-public`
              try {
                const clientSocket = io.getIO().sockets.sockets.get(socketId)
                clientSocket.join(streamRoom)
                const roomSize = io
                  .getIO()
                  .sockets.adapter.rooms.get(streamRoom)?.size
                io.getIO().in(streamRoom).emit(socketEvents.viewerJoined, {
                  roomSize: roomSize,
                })
                puttedInRooms = true
              } catch (error) {
                puttedInRooms = false
              }

              return res.status(200).json({
                actionStatus: "success",
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
                newUnAuthedUserCreated: false,
                theModel: theModel,
                streamId: theModel.currentStream._id,
                puttedInRooms: puttedInRooms,
              })
            } else {
              /* means the un-authedUserId is invalid */
              /* ===================================== */
              return UnAuthedViewer({
                sessions: 1,
                streamViewed: 1,
                lastStream: model.currentStream,
              })
                .save()
                .then((viewer) => {
                  // generate twilio chat token as well
                  const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                    "unAuthed",
                    viewer._id.toString(),
                    model._id.toString()
                  )
                  //way1:👉 io.in(theSocketId).socketsJoin("room1");
                  //way2:👉 io.sockets.sockets.get(socketId)
                  const streamRoom = `${model.currentStream}-public`
                  try {
                    const clientSocket = io
                      .getIO()
                      .sockets.sockets.get(socketId)
                    clientSocket.join(streamRoom)
                    const roomSize = io
                      .getIO()
                      .sockets.adapter.rooms.get(streamRoom)?.size
                    io.getIO().in(streamRoom).emit(socketEvents.viewerJoined, {
                      roomSize: roomSize,
                    })
                    puttedInRooms = true
                  } catch (error) {
                    puttedInRooms = false
                  }

                  return res.status(200).json({
                    actionStatus: "success",
                    unAuthedUserId: viewer._id,
                    rtcToken: rtcToken,
                    privilegeExpiredTs: privilegeExpiredTs,
                    newUnAuthedUserCreated: true,
                    theModel: theModel,
                    streamId: theModel.currentStream._id,
                    puttedInRooms: puttedInRooms,
                  })
                })
                .catch((err) => {
                  throw err
                })
            }
          })
          .catch((err) => {
            throw err
          })
      }
      /* have to show offline screen */
      return res.status(200).json({
        actionStatus: "success",
        message: "model not streaming",
        theModel: theModel,
      })
    })
    .catch((error) => next(error))
}

exports.renewRtcTokenGlobal = (req, res, next) => {
  // renew token for anybody be model or viewer or unAuthed viewer
  controllerErrorCollector(req)
  const { channel, relatedUserId } = req.body
  if (!req.user) {
    UnAuthedViewer.findOne({ _id: relatedUserId })
      .then((viewer) => {
        if (!viewer) {
          const err = new Error("Not Authorized")
          err.statusCode = 401
          throw err
        }
        const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
          "unAuthed",
          relatedUserId,
          channel
        )
        return res.status(200).json({
          actionStatus: "success",
          rtcToken: rtcToken,
          privilegeExpiredTs: privilegeExpiredTs,
        })
      })
      .catch((err) => next(err))
  }

  if (req.user.userType === "Viewer") {
    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
      "viewer",
      relatedUserId,
      channel
    )
  } else if (req.user.userType === "Model") {
    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
      "model",
      relatedUserId,
      channel
    )
  }

  res.status(200).json({
    actionStatus: "success",
    rtcToken: rtcToken,
    privilegeExpiredTs: privilegeExpiredTs,
  })
}
