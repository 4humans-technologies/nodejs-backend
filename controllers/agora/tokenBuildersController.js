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
const Wallet = require("../../models/globals/wallet")
const AudioCall = require("../../models/globals/audioCall")
const VideoCall = require("../../models/globals/videoCall")

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
        )?.[0]
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
      const genResult = rtcTokenGenerator(
        "model",
        req.user.relatedUser._id.toString(),
        req.user.relatedUser._id.toString()
      )
      privilegeExpiredTs = genResult.privilegeExpiredTs
      rtcToken = genResult.rtcToken
      const publicChats = getDatabase()
        .ref("publicChats")
        .child(theStream._id.toString())
      return publicChats.set({
        model: req.user.relatedUser._id.toString(),
        chats: [],
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
      try {
        clientSocket.isStreaming = true
        clientSocket.streamId = theStream._id.toString()
        clientSocket.createdAt = Date.now()
        clientSocket.join(streamRoomPublic)
        /* redundency just to make sure */
        clientSocket.join(`${req.user.relatedUser._id.toString()}-private`)
      } catch (err) {
        /* try catch just for safety */
      }
      io.getIO().emit(socketEvents.streamCreated, {
        modelId: req.user.relatedUser._id,
        profileImage: model.profileImage,
        liveNow: io.increaseLiveCount({
          _id: req.user.relatedUser._id.toString(),
          username: req.user.username,
        }),
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
        .catch(() => next(err))
        .finally(() => next(err))
    })
}

exports.genRtcTokenViewer = (req, res, next) => {
  controllerErrorCollector(req)

  let { modelId, purchasedImageAlbums, purchasedVideoAlbums } = req.body
  const { socketId } = req.query

  if (!purchasedImageAlbums) {
    purchasedImageAlbums = []
  }
  if (!purchasedVideoAlbums) {
    purchasedVideoAlbums = []
  }

  const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
    "viewer",
    req.user.relatedUser._id.toString(),
    modelId
  )

  let theModel
  let selectString =
    "currentStream numberOfFollowers minCallDuration callActivity isStreaming onCall tags rating profileImage publicImages publicVideos privateImages privateVideos hobbies bio languages dob name gender ethnicity dynamicFields offlineStatus tipMenuActions charges"
  Model.findOne({
    _id: modelId,
  })
    .select(selectString)
    .populate({
      path: "rootUser",
      select: "username",
    })
    .populate({
      path: "tags",
      select: "name",
    })
    .populate({
      path: "privateImages",
      match: {
        _id: { $nin: purchasedImageAlbums },
      },
      model: "ImageAlbum",
      select: "-originalImages",
      options: { lean: true },
    })
    .populate({
      path: "privateVideos",
      match: { _id: { $nin: purchasedVideoAlbums } },
      model: "VideoAlbum",
      select: "-originalVideos",
      options: { lean: true },
    })
    .lean()
    .then((model) => {
      theModel = model
      if (model?.isStreaming) {
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
        /**
         * populate the purchased  private image and video album
         */
        const viewerPr = Viewer.findOneAndUpdate(
          {
            _id: req.user.relatedUser._id,
          },
          {
            $addToSet: { streams: Types.ObjectId(model.currentStream._id) },
          }
        )
          .select(
            "isChatPlanActive privateImagesPlans privateVideosPlans currentChatPlan wallet audioCallHistory videoCallHistory streams gender following name profileImage"
          )
          .populate("wallet")
          .populate({
            path: "rootUser",
            select: "username",
          })
          .populate({
            path: "privateImagesPlans",
            match: { model: modelId },
            populate: {
              path: "albums",
              model: "ImageAlbum",
              select: "-thumbnails",
              options: { lean: true },
            },
          })
          .populate({
            path: "privateVideosPlans",
            match: { model: modelId },
            populate: {
              path: "albums",
              model: "VideoAlbum",
              select: "-thumbnails",
              options: { lean: true },
            },
          })
          .lean()
        return Promise.all([streamPr, viewerPr])
          .then((values) => {
            const viewer = values[1]
            const streamRoom = `${theModel.currentStream._id}-public`
            let socketUpdated = false

            let viewerDetails = {
              _id: req.user.relatedUser._id,
              username: viewer.rootUser.username,
              name: viewer.name,
              walletCoins: viewer.wallet.currentAmount,
              profileImage: viewer.profileImage,
              isChatPlanActive: viewer.isChatPlanActive,
            }

            try {
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

              clientSocket.onStream = true
              clientSocket.streamId = theModel.currentStream._id.toString()
              /* join the public chat room */
              clientSocket.join(streamRoom)
              /* deliberately making him rejoin just incase he has left the private room */
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
                    ...viewerDetails,
                  },
                })

              /* emit in public room, with only room size */
              io.getIO().in(streamRoom).emit(socketEvents.viewerJoined, {
                roomSize: roomSize,
              })
              socketUpdated = true
            } catch (err) {
              socketUpdated = false
            }

            /* combine viewers purchased album with  */
            if (viewer.privateImagesPlans[0]) {
              theModel.privateImages.push(
                ...viewer.privateImagesPlans[0].albums
              )
            }

            /* PUSH PRIVATE VIDEOS */
            if (viewer.privateVideosPlans[0]) {
              theModel.privateVideos.push(
                ...viewer.privateVideosPlans[0].albums
              )
            }

            return res.status(200).json({
              actionStatus: "success",
              rtcToken: rtcToken,
              privilegeExpiredTs: privilegeExpiredTs,
              streamId: theModel.currentStream._id,
              theModel: theModel,
              isChatPlanActive: viewer.isChatPlanActive,
              socketUpdated: socketUpdated,
              viewerDetails: viewerDetails,
            })
          })
          .catch((err) => next(err))
      } else {
        /* ID MODEL NOT STREAMING */
        Viewer.findOne({
          _id: req.user.relatedUser._id,
        })
          .select("isChatPlanActive privateImagesPlans privateVideosPlans")
          .populate({
            path: "privateImagesPlans",
            match: { model: modelId },
            populate: {
              path: "albums",
              model: "ImageAlbum",
              select: "-thumbnails",
              options: { lean: true },
            },
          })
          .populate({
            path: "privateVideosPlans",
            match: { model: modelId },
            populate: {
              path: "albums",
              model: "VideoAlbum",
              select: "-thumbnails",
              options: { lean: true },
            },
          })
          .lean()
          .then((viewer) => {
            /* PUSH PRIVATE IMAGES */
            if (viewer.privateImagesPlans[0]) {
              theModel.privateImages.push(
                ...viewer.privateImagesPlans[0].albums
              )
            }

            /* PUSH PRIVATE VIDEOS */
            if (viewer.privateVideosPlans[0]) {
              theModel.privateVideos.push(
                ...viewer.privateVideosPlans[0].albums
              )
            }

            return res.status(200).json({
              actionStatus: "success",
              message: "model not streaming",
              theModel: theModel,
              isChatPlanActive: viewer.isChatPlanActive,
            })
          })
          .catch((err) => {
            throw err
          })
      }
    })
    .catch((err) => next(err))
}

exports.generateRtcTokenUnauthed = (req, res, next) => {
  controllerErrorCollector(req)
  // will run when unauthed user try to view models live stream, not when he enters the website
  // create unAuthed user and generate token
  const { modelId } = req.body
  const { socketId, unAuthedUserId } = req.query

  let theModel
  let socketUpdated
  Model.findById(modelId)
    .select(
      "currentStream numberOfFollowers minCallDuration callActivity isStreaming onCall tags rating profileImage publicImages publicVideos privateImages privateVideos hobbies bio languages dob name gender ethnicity dynamicFields offlineStatus tipMenuActions charges"
    )
    .populate({
      path: "tags",
      select: "name",
    })
    .populate({
      path: "rootUser",
      select: "username",
    })
    .populate({
      path: "privateImages",
      model: "ImageAlbum",
      select: "-originalImages",
      options: { lean: true },
    })
    .populate({
      path: "privateVideos",
      model: "VideoAlbum",
      select: "-originalVideos",
      options: { lean: true },
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
                socketUpdated = true
              } catch (err) {
                socketUpdated = false
              }

              console.log("New un-authed user created :", viewer._id.toString())
              return res.status(200).json({
                actionStatus: "success",
                unAuthedUserId: viewer._id,
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
                newUnAuthedUserCreated: true,
                streamId: model.currentStream._id,
                theModel: theModel,
                socketUpdated: socketUpdated,
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
                unAuthedUserId,
                modelId
              )

              const streamRoom = `${model.currentStream}-public`
              let roomSize
              try {
                const clientSocket = io.getIO().sockets.sockets.get(socketId)
                clientSocket.join(streamRoom)
                roomSize = io
                  .getIO()
                  .sockets.adapter.rooms.get(streamRoom)?.size
                io.getIO().in(streamRoom).emit(socketEvents.viewerJoined, {
                  roomSize: roomSize,
                })
                socketUpdated = true
              } catch (error) {
                socketUpdated = false
              }

              return res.status(200).json({
                actionStatus: "success",
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
                newUnAuthedUserCreated: false,
                theModel: theModel,
                streamId: theModel.currentStream._id,
                socketUpdated: socketUpdated,
                roomSize: roomSize,
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
                  let roomSize
                  try {
                    const clientSocket = io
                      .getIO()
                      .sockets.sockets.get(socketId)
                    clientSocket.join(streamRoom)
                    roomSize = io
                      .getIO()
                      .sockets.adapter.rooms.get(streamRoom)?.size
                    io.getIO().in(streamRoom).emit(socketEvents.viewerJoined, {
                      roomSize: roomSize,
                    })
                    socketUpdated = true
                  } catch (error) {
                    socketUpdated = false
                  }

                  return res.status(200).json({
                    actionStatus: "success",
                    unAuthedUserId: viewer._id,
                    rtcToken: rtcToken,
                    privilegeExpiredTs: privilegeExpiredTs,
                    newUnAuthedUserCreated: true,
                    theModel: theModel,
                    streamId: theModel.currentStream._id,
                    socketUpdated: socketUpdated,
                    roomSize: roomSize,
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
  // controllerErrorCollector(req)

  const { channel, unAuthedUserId, onCall } = req.query

  /**
   * should ABSOLUTELY check is this channel exists
   */

  if (onCall && req?.user?.userType === "Model") {
    /**
     * this case below is exclusively only for the model who is on call
     */
    const callQuery =
      req.query.callType === "audioCall"
        ? AudioCall.findById({
            _id: req.query.callId,
          }).lean()
        : VideoCall.findById({
            _id: req.query.callId,
          }).lean()

    let canRenew = false
    let privilegeExpiredTs, rtcToken
    let generatedFor = 60
    Promise.all([
      callQuery,
      Wallet.findOne({
        relatedUser: req.query.viewerId,
      }),
      Wallet.findOne({
        relatedUser: req.user.relatedUser._id,
      }),
    ])
      .then(([callDoc, wallet, modelWallet]) => {
        if (
          callDoc.status === "ongoing" &&
          callDoc.viewer.toString() === req.query.viewerId
        ) {
          /**
           * amount left in viewers wallet
           */
          const amountLeft = wallet.currentAmount - callDoc.chargePerMin
          /**
           * token cannot be generated for less than 1 minute
           */
          if (amountLeft - callDoc.chargePerMin > 0) {
            canRenew = true
            wallet.deductAmount(callDoc.chargePerMin)
            modelWallet.addAmount(
              callDoc.chargePerMin * (callDoc.sharePercent / 100)
            )
            const a = rtcTokenGenerator(
              "model",
              req.user.relatedUser._id,
              req.user.relatedUser._id,
              generatedFor,
              "sec"
            )
            privilegeExpiredTs = a.privilegeExpiredTs
            rtcToken = a.rtcToken
            return Promise.all([wallet.save(), modelWallet.save(), {}])
          } else {
            /**
             * calculate in secs amount of time the user can call, deduct all the money
             * and generate token for all the amount
             *
             */
            modelWallet.addAmount(
              wallet.currentAmount * (callDoc.sharePercent / 100)
            )
            wallet.currentAmount = 0

            generatedFor = Math.floor(
              (wallet.currentAmount * 60) / callDoc.chargePerMin
            )
            const a = rtcTokenGenerator(
              "model",
              req.user.relatedUser._id,
              req.user.relatedUser._id,
              generatedFor,
              "sec"
            )
            privilegeExpiredTs = a.privilegeExpiredTs
            rtcToken = a.rtcToken
            return Promise.all([wallet.save(), modelWallet.save()])
          }
        } else {
          const error = new Error("call is already ended or caller is invalid")
          error.statusCode = 422
          throw error
        }
      })
      .then(() => {
        return res.status(200).json({
          canRenew,
          privilegeExpiredTs,
          rtcToken,
          generatedFor,
        })
      })
      .catch((err) => next(err))
    /**
     * if onCall get the viewers wallet
     */
  } else {
    Model.findById(channel)
      .select("isStreaming onCall")
      .lean()
      .then((model) => {
        /**
         * if unAuthedUser
         */
        if (!req.user) {
          if (model.isStreaming && !model.onCall) {
            /**
             * un-authed user can not ask token for streaming model
             */
            const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
              "unAuthed",
              unAuthedUserId,
              channel
            )

            return res
              .status(200)
              .json({
                actionStatus: "success",
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
              })
              .catch((err) => next(err))
          } else {
            throw Error("Model is not streaming and you cannot join call!")
          }
        } else {
          /**
           * if authed user
           */
          if (model.isStreaming || model.onCall) {
            /**
             * onCall is a special case not if model is onCall
             * not anybody can ask for token, ONLY the CALLER should be able to get the token 🔴
             */
            if (req.user.userType === "Viewer") {
              const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                "viewer",
                req.user.relatedUser._id,
                channel
              )
              return res.status(200).json({
                actionStatus: "success",
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
              })
            } else if (req.user.userType === "Model") {
              const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                "model",
                req.user.relatedUser._id,
                channel
              )
              return res.status(200).json({
                actionStatus: "success",
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
              })
            }
          } else {
            /**
             * if model is just not available
             */
            throw Error("Suspicious act of joining a restricted channel")
          }
        }
      })
      .catch((err) => next(err))
  }
}
