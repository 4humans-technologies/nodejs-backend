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

const redisClient = require("../../redis")

exports.createStreamAndToken = (req, res, next) => {
  controllerErrorCollector(req)
  const { socketId } = req.query

  let clientSocket = io.getIO().sockets.sockets.get(socketId)

  if (req.user.needApproval) {
    return res.status(422).json({
      actionStatus: "failed",
      message:
        "You need approval to start streaming, please contact admin for it!",
    })
  }

  try {
    var modelRoomSIDS = Array.from(
      io
        .getIO()
        .sockets.adapter.rooms.get(`${req.user.relatedUser._id}-private`)
    )

    var modelRoomSockets = []
    modelRoomSIDS.forEach((sid) => {
      modelRoomSockets.push(io.getIO().sockets.sockets.get(sid))
    })

    if (!clientSocket) {
      if (modelRoomSIDS.length === 1) {
        clientSocket = modelRoomSockets?.[0]
      }
    }

    // if (req.user.relatedUser.isStreaming || req.user.relatedUser.onCall) {}
    var isModelLiveAlready = false
    if (modelRoomSIDS.length > 1) {
      /**
       * if is isStreaming === true and two sockets in private room
       * then model is streaming
       */
      modelRoomSockets.forEach((client) => {
        if (
          client?.isStreaming ||
          client.data?.onStream ||
          client?.onCall ||
          client?.callId
        ) {
          isModelLiveAlready = true
        }
      })
    }

    if (req.user.relatedUser.isStreaming || req.user.relatedUser.onCall) {
      /**
       * 100% sure, it fraudulent attempt of streaming
       */
      if (isModelLiveAlready) {
        return res.status(400).json({
          actionStatus: "failed",
          message:
            "You are streaming or on call, already from another device, streaming from two devices is not currently supported! 💻",
        })
      }
    } else {
      /**
       * can do some extra checks
       */
      if (isModelLiveAlready) {
        return res.status(400).json({
          actionStatus: "failed",
          message:
            "You are streaming or on call, already from another device, streaming from two devices is not currently supported! 💻",
        })
      }
    }
  } catch (err) {
    if (clientSocket) {
      clientSocket.join(`${req.user.relatedUser._id}-private`)
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
          $addToSet: { streams: theStream._id },
        }
      )
        .select("profileImage bannedStates")
        .lean()
    })
    .then((model) => {
      const streamRoomPublic = `${theStream._id}-public`
      try {
        clientSocket.isStreaming = true
        clientSocket.data.streamId = theStream._id.toString()
        clientSocket.createdAt = Date.now()
        clientSocket.join(streamRoomPublic)
        /* redundancy just to make sure */
        clientSocket.join(`${req.user.relatedUser._id.toString()}-private`)
      } catch (err) {
        /* try catch just for safety */
      }
      /**
       * create new viewer list
       */
      return redisClient.set(
        `${theStream._id.toString()}-public`,
        "[]",
        (err) => {
          if (!err) {
            /**
             * create new transaction history list
             */
            const transactions = []
            redisClient.set(
              `${theStream._id.toString()}-transactions`,
              JSON.stringify(transactions),
              (err) => {
                if (!err) {
                  /**
                   * notify user about new stream
                   */
                  io.getIO().emit(socketEvents.streamCreated, {
                    modelId: req.user.relatedUser._id,
                    profileImage: model.profileImage,
                    streamId: theStream._id,
                    bannedStates: model.bannedStates,
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
                } else {
                  return next(err)
                }
              }
            )
          } else {
            return next(err)
          }
        }
      )
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
    "currentStream welcomeMessage numberOfFollowers topic minCallDuration backGroundImage callActivity isStreaming onCall tags rating profileImage publicImages publicVideos privateImages privateVideos hobbies bio languages dob name gender ethnicity dynamicFields offlineStatus tipMenuActions charges ethnicity eyeColor bodyType hairColor skinColor country"
  Model.findOne({
    _id: modelId,
  })
    .select(selectString)
    .populate({
      path: "rootUser",
      select: "username",
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
                    )?.[0]
                  )
              }

              clientSocket.data.onStream = true
              clientSocket.data.streamId = theModel.currentStream._id.toString()
              /* join the public chat room */
              clientSocket.join(streamRoom)
              /* deliberately making him rejoin just incase he has left the private room */
              clientSocket.join(`${req.user.relatedUser._id}-private`)
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

            // redis
            redisClient.get(streamRoom, (err, viewers) => {
              const myViewers = JSON.parse(viewers || "[]")
              if (
                !myViewers.find(
                  (viewer) => viewer._id === req.user.relatedUser._id
                )
              ) {
                myViewers.push(viewerDetails)
                viewers = JSON.stringify(myViewers)
              }
              redisClient.set(streamRoom, viewers, (err) => {
                if (!err) {
                  redisClient.get(
                    `${theModel.currentStream._id}-transactions`,
                    (err, transactions) => {
                      if (!err) {
                        var king = JSON.parse(transactions)?.[0]
                        var roomSize = io
                          .getIO()
                          .sockets.adapter.rooms.get(streamRoom)?.size
                        /**
                         * emit user with detail to every one
                         */
                        io.getIO()
                          .in(streamRoom)
                          .emit(`${socketEvents.viewerJoined}-private`, {
                            roomSize: roomSize,
                            viewer: {
                              ...viewerDetails,
                            },
                          })

                        /**
                         * emit in public room, with only room size
                         */
                        io.getIO()
                          .in(streamRoom)
                          .emit(socketEvents.viewerJoined, {
                            roomSize: roomSize,
                            unAuthed: false,
                          })

                        return res.status(200).json({
                          actionStatus: "success",
                          rtcToken: rtcToken,
                          privilegeExpiredTs: privilegeExpiredTs,
                          streamId: theModel.currentStream._id,
                          theModel: theModel,
                          isChatPlanActive: viewer.isChatPlanActive,
                          socketUpdated: socketUpdated,
                          viewerDetails: viewerDetails,
                          liveViewersList: myViewers,
                          king: king,
                          roomSize: roomSize,
                        })
                      } else {
                        /* err getting transactions */
                        console.error(
                          "Error while getting redis transactions in authed token builder"
                        )
                        return next(err)
                      }
                    }
                  )
                } else {
                  console.error(
                    "Error while setting redis viewers in authed token builder"
                  )
                  return next(err)
                }
              })
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
            if (viewer?.privateImagesPlans[0]) {
              theModel.privateImages.push(
                ...viewer.privateImagesPlans[0].albums
              )
            }

            /* PUSH PRIVATE VIDEOS */
            if (viewer?.privateVideosPlans[0]) {
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
  let socketUpdated = false
  Model.findById(modelId)
    .select(
      "currentStream welcomeMessage numberOfFollowers topic minCallDuration backGroundImage callActivity isStreaming onCall tags rating profileImage publicImages publicVideos privateImages privateVideos hobbies bio languages dob name gender ethnicity dynamicFields offlineStatus tipMenuActions charges ethnicity eyeColor bodyType hairColor skinColor country"
    )
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
        return Promise.reject("Invalid model this model does not exists!")
      }

      theModel = model
      if (model.isStreaming && model.currentStream) {
        /**
         * add un-authed viewer also in viewer list
         */
        redisClient.get(
          `${theModel.currentStream._id}-public`,
          (err, viewers) => {
            if (!err && viewers) {
              viewers = JSON.parse(viewers)
              viewers.push({
                unAuthed: true,
              })
              redisClient.set(
                `${theModel.currentStream._id}-public`,
                JSON.stringify(viewers),
                (err) => {
                  if (!err) {
                    redisClient.get(
                      `${model.currentStream._id}-transactions`,
                      (err, transactions) => {
                        if (!err) {
                          var king = JSON.parse(transactions)?.[0]
                          /**
                           * all the DB code goes below 👇👇
                           */

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
                                const { privilegeExpiredTs, rtcToken } =
                                  rtcTokenGenerator(
                                    "unAuthed",
                                    viewer._id.toString(),
                                    model._id.toString()
                                  )
                                //way1:👉 io.in(theSocketId).socketsJoin("room1");
                                //way2:👉 io.sockets.sockets.get(socketId)

                                const streamRoom = `${model.currentStream._id}-public`
                                try {
                                  const clientSocket = io
                                    .getIO()
                                    .sockets.sockets.get(socketId)
                                  /* add stream data on the client */
                                  clientSocket.data.onStream = true
                                  clientSocket.data.streamId =
                                    theModel.currentStream._id.toString()
                                  /* join the public room */
                                  clientSocket.join(streamRoom)
                                  const roomSize = io
                                    .getIO()
                                    .sockets.adapter.rooms.get(streamRoom)?.size
                                  /* emit to all to self also */
                                  io.getIO()
                                    .in(streamRoom)
                                    .emit(socketEvents.viewerJoined, {
                                      roomSize: roomSize,
                                      unAuthed: true,
                                    })
                                  socketUpdated = true
                                } catch (err) {
                                  socketUpdated = false
                                }

                                return res.status(200).json({
                                  actionStatus: "success",
                                  unAuthedUserId: viewer._id,
                                  rtcToken: rtcToken,
                                  privilegeExpiredTs: privilegeExpiredTs,
                                  newUnAuthedUserCreated: true,
                                  streamId: model.currentStream._id,
                                  theModel: theModel,
                                  socketUpdated: socketUpdated,
                                  king: king,
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
                                const { privilegeExpiredTs, rtcToken } =
                                  rtcTokenGenerator(
                                    "unAuthed",
                                    unAuthedUserId,
                                    modelId
                                  )

                                const streamRoom = `${model.currentStream}-public`
                                let roomSize
                                try {
                                  const clientSocket = io
                                    .getIO()
                                    .sockets.sockets.get(socketId)
                                  clientSocket.join(streamRoom)
                                  clientSocket.data.onStream = true
                                  clientSocket.data.streamId =
                                    theModel.currentStream._id.toString()
                                  roomSize = io
                                    .getIO()
                                    .sockets.adapter.rooms.get(streamRoom)?.size

                                  io.getIO()
                                    .in(streamRoom)
                                    .emit(socketEvents.viewerJoined, {
                                      roomSize: roomSize,
                                      unAuthed: true,
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
                                  king: king,
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
                                    const { privilegeExpiredTs, rtcToken } =
                                      rtcTokenGenerator(
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
                                      clientSocket.data.onStream = true
                                      clientSocket.data.streamId =
                                        theModel.currentStream._id.toString()
                                      var roomSize = io
                                        .getIO()
                                        .sockets.adapter.rooms.get(
                                          streamRoom
                                        )?.size

                                      io.getIO()
                                        .in(streamRoom)
                                        .emit(socketEvents.viewerJoined, {
                                          roomSize: roomSize,
                                          unAuthed: true,
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
                                      king: king,
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
                        } else {
                          /* err */
                          console.error("Redis get/set error", err)
                          next(err)
                        }
                      }
                    )
                  } else {
                    /* err */
                    console.error("Redis get/set error", err)
                    next(err)
                  }
                }
              )
            } else {
              /* err */
              console.error("Redis get/set error", err)
              return next(err)
            }
          }
        )
      } else {
        /* have to show offline screen */
        return res.status(200).json({
          actionStatus: "success",
          message: "model not streaming",
          theModel: theModel,
        })
      }
    })
    .catch((error) => next(error))
}

exports.renewRtcTokenGlobal = (req, res, next) => {
  // renew token for anybody be model or viewer or unAuthed viewer
  // controllerErrorCollector(req)

  const { channel, unAuthedUserId, onCall } = req.query

  // const onCall = Boolean(req.query.onCall)

  /**
   * should ABSOLUTELY check is this channel exists
   */

  if (onCall === "true") {
    const RENEW_BUFFER_TIME = 8
    let generatedFor = 60 + RENEW_BUFFER_TIME
    if (req.user.userType === "Model") {
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

            if (amountLeft <= 0) {
              /**
               * does not have suffecient balance for the next minute
               * hence end the call immideatly
               */
              return Promise.all([true, wallet.save(), modelWallet.save(), {}])
            }
            /**
             * token cannot be generated for less than 1 minute
             */
            if (amountLeft - callDoc.chargePerMin > 0) {
              /**
               * can afford next minute of call
               */
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
              return Promise.all([false, wallet.save(), modelWallet.save(), {}])
            } else {
              /**
               * viewer cannot afford next minute call
               * calculate in secs amount of time the user can call, deduct all the money
               * and generate token for all the amount
               */
              canRenew = false
              generatedFor =
                Math.floor((wallet.currentAmount * 60) / callDoc.chargePerMin) +
                RENEW_BUFFER_TIME
              modelWallet.addAmount(
                wallet.currentAmount * (callDoc.sharePercent / 100)
              )
              wallet.currentAmount = 0
              const a = rtcTokenGenerator(
                "model",
                req.user.relatedUser._id,
                req.user.relatedUser._id,
                generatedFor,
                "sec"
              )

              privilegeExpiredTs = a.privilegeExpiredTs
              rtcToken = a.rtcToken
              return Promise.all([false, wallet.save(), modelWallet.save()])
            }
          } else {
            const error = new Error(
              "call is already ended or caller is invalid"
            )
            error.statusCode = 422
            throw error
          }
        })
        .then((result) => {
          return res.status(200).json({
            endImmediately: result[0],
            canRenew,
            privilegeExpiredTs,
            rtcToken,
            generatedFor,
          })
        })
        .catch((err) => next(err))
    } else if (req.user.userType === "Viewer") {
      /**
       * for ONCALL VIEWER
       */
      const callQuery =
        req.query.callType === "audioCall"
          ? AudioCall.findById({
              _id: req.query.callId,
            })
              .lean()
              .select("status model viewer chargePerMin")
          : VideoCall.findById({
              _id: req.query.callId,
            })
              .lean()
              .select("status model viewer chargePerMin")

      Promise.all([callQuery])
        .then(([call]) => {
          if (
            call.viewer.toString() === req.user.relatedUser._id &&
            call.model.toString() === channel &&
            call.status === "ongoing"
          ) {
            const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
              "model",
              req.user.relatedUser._id,
              channel,
              generatedFor,
              "sec"
            )

            return res.status(200).json({
              privilegeExpiredTs,
              rtcToken,
              generatedFor,
            })
          } else {
            const error = new Error(
              "Not authorized, to get token for this action!"
            )
            error.statusCode = 422
            throw error
          }
        })
        .catch((err) => next(err))
    }
  } else {
    Model.findById(channel)
      .select("isStreaming onCall")
      .lean()
      .then((model) => {
        /**
         * gen token only if model is streaming and not on Call
         */
        if (model.isStreaming && !model.onCall) {
          /**
           * if unAuthedUser
           */
          if (!req?.user) {
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
            /**
             * if authed user
             */
            if (req.user.userType === "Viewer") {
              const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                "viewer",
                req.user.relatedUser._id,
                channel,
                0.5,
                "hours"
              )
              return res.status(200).json({
                actionStatus: "success",
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
              })
            } else if (req.user.userType === "Model") {
              /**
               * if streaming model
               */
              const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                "model",
                req.user.relatedUser._id,
                channel,
                1,
                "hours"
              )
              return res.status(200).json({
                actionStatus: "success",
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
              })
            }
          }
        } else {
          const error = new Error(
            "Model is not streaming and you cannot join call!"
          )
          error.statusCode = 400
          throw error
        }
      })
      .catch((err) => next(err))
  }
}
