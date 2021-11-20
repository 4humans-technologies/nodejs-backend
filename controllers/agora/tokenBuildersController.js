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

  // 🤐🤐 ➡➡ will keep channel as modelID
  const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
    "model",
    req.user.relatedUser._id.toString(),
    req.user.relatedUser._id.toString()
  )
  // check if the model is approved or not,
  // by making a new model approval checker

  /* 🔺🔺 commented for presentation only 🔻🔻 */
  if (process.env.RUN_ENV === "ubuntu") {
    if (req.user.relatedUser.isStreaming || req.user.relatedUser.onCall) {
      return res.status(400).json({
        actionStatus: "failed",
        message:
          "You are streaming or taking call, already from another account, streaming from two devices is not currently supported!",
      })
    }
  }

  let theStream
  Stream({
    model: req.user.relatedUser._id,
    createdAt: new Date(),
  })
    .save()
    .then((stream) => {
      theStream = stream
      const publicChats = realtimeDb
        .ref("publicChats")
        .child(theStream._id.toString())
      return publicChats.set({
        model: { ...req.user },
        chats: ["hello"],
      })
    })
    .then((returnValue) => {
      console.log("Value returned from firebase >> ", returnValue)
      return Model.findOneAndUpdate(
        { _id: req.user.relatedUser._id },
        {
          isStreaming: true,
          currentStream: theStream._id,
          /* 👇👇 how to ensure same theStream is not added again */
          $push: { streams: theStream },
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
      /* save data on client about the stream */
      clientSocket.isStreaming = true
      clientSocket.streamId = theStream._id.toString()
      clientSocket.join(streamRoomPublic)

      /* 👇👇 broadcast to all who are not in any room */
      // io.getIO().except(io.getIO().sockets.adapter.rooms)
      clientSocket.broadcast.emit(socketEvents.streamCreated, {
        modelId: req.user.relatedUser._id,
        profileImage: model.profileImage,
        streamId: theStream._id.toString(),
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
            $addToSet: {
              viewers: Types.ObjectId(req.user.relatedUser._id),
            },
            $inc: {
              "meta.viewerCount": 1,
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
          .select("isChatPlanActive currentChatPlan")
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
            /* save data on client about the stream */
            clientSocket.isStreaming = true
            clientSocket.streamId = theModel.currentStream._id.toString()
            clientSocket.join(streamRoom)
            if (viewer.isChatPlanActive) {
              if (
                /* 👇👇 for use in production */
                // new Date(viewer.currentChatPlan.willExpireOn).getTime() >
                // Date.now() + 10000
                /* for now always true */
                true
              ) {
                // const privateStreamRoom = `${theModel._id}-private`
                // clientSocket.join(privateStreamRoom)
                /* join his own id channel */
                clientSocket.join(`${req.user.relatedUser._id}-private`)
              }
            }
            const roomSize = io
              .getIO()
              .sockets.adapter.rooms.get(streamRoom).size
            clientSocket.to(streamRoom).emit(socketEvents.viewerJoined, {
              roomSize: roomSize,
              message: "New user join the stream 🤩🤩",
            })

            // http response
            return res.status(200).json({
              actionStatus: "success",
              rtcToken: rtcToken,
              privilegeExpiredTs: privilegeExpiredTs,
              viewerCount: roomSize,
              streamId: theModel.currentStream._id,
              theModel: theModel,
              isChatPlanActive: viewer.isChatPlanActive,
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
                clientSocket.join(streamRoom)
                const roomSize = io
                  .getIO()
                  .sockets.adapter.rooms.get(streamRoom).size
                clientSocket.to(streamRoom).emit(socketEvents.viewerJoined, {
                  roomSize: roomSize,
                  message: "New user join the stream 🤩🤩",
                })
                puttedInRooms = true
              } catch (err) {
                puttedInRooms = false
              }

              res.status(200).json({
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
                  .sockets.adapter.rooms.get(streamRoom).size
                io.getIO().to(streamRoom).emit(socketEvents.viewerJoined, {
                  roomSize: roomSize,
                  message: "New user join the stream 🤩🤩",
                })
                puttedInRooms = true
              } catch (error) {
                puttedInRooms = false
              }

              res.status(200).json({
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
                      .sockets.adapter.rooms.get(streamRoom).size
                    io.getIO().to(streamRoom).emit(socketEvents.viewerJoined, {
                      roomSize: roomSize,
                      message: "New user join the stream 🤩🤩",
                    })
                    puttedInRooms = true
                  } catch (error) {
                    puttedInRooms = false
                  }

                  res.status(200).json({
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
