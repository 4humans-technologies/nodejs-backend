const AudioCall = require("../../models/globals/audioCall")
const Stream = require("../../models/globals/Stream")
const CoinsSpendHistory = require("../../models/globals/coinsSpendHistory")
const coinsUses = require("../../utils/coinsUseCaseStrings")
const VideoCall = require("../../models/globals/videoCall")
const Wallet = require("../../models/globals/wallet")
const Model = require("../../models/userTypes/Model")
const Viewer = require("../../models/userTypes/Viewer")
const io = require("../../socket")
const redisClient = require("../../redis")
const socketEvents = require("../../utils/socket/socketEvents")
const PrivateChatPlan = require("../../models/management/privateChatPlan")
const chatEvents = require("../../utils/socket/chat/chatEvents")
const controllerErrorCollector = require("../../utils/controllerErrorCollector")
const { getDatabase } = require("firebase-admin/database")
const Notifier = require("../../utils/Events/Notification")
const rtcTokenGenerator = require("../../utils/rtcTokenGenerator")

exports.handleEndStream = (req, res, next) => {
  // this will be called by the model only

  let { streamId } = req.body
  const { socketId } = req.query

  // will send socket event to trigger leave agora channel on client
  // anyway they have to renew token hence no misuse for longer period

  Promise.all([
    Model.findOneAndUpdate(
      { _id: req.user.relatedUser._id },
      {
        isStreaming: false,
        currentStream: null,
        onCall: false,
      },
      {
        new: false,
      }
    )
      .select("isStreaming onCall currentStream")
      .lean(),
    Stream.findById(streamId),
  ])
    .then(([model, stream]) => {
      if (
        stream.status !== "ended" &&
        model.isStreaming &&
        model.currentStream
      ) {
        const duration =
          (new Date().getTime() - new Date(stream.createdAt).getTime()) /
          1000 /* in minutes */
        stream.endReason = "manual"
        stream.status = "ended"
        stream.duration = Math.round(duration)

        /* emit to all about delete stream room */
        return Promise.all([
          stream.save(),
          getDatabase().ref("publicChats").child(streamId).remove(),
        ])
      } else {
        const error = new Error(
          "Stream is already ended and models was not streaming"
        )
        console.error("model > ", model)
        console.error("stream > ", stream)
        error.statusCode = 422
        throw error
      }
    })
    .then(() => {
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

      /* remove previous streams attributes from socket client */
      clientSocket.isStreaming = false
      clientSocket.streamId = null

      /* destroy the stream chat rooms, heave to leave rooms on server as on client side it will overwhelm the client */
      io.getIO().in(`${streamId}-public`).socketsLeave(`${streamId}-public`)

      redisClient.del(`${streamId}-public`, (err) => {
        if (err) {
          console.error("Redis viewer list delete err", err)
        }
        redisClient.del(`${streamId}-transactions`, (err) => {
          if (err) {
            console.error("Redis transaction history delete err", err)
          }
          return res.status(200).json({
            actionStatus: "success",
          })
        })
      })
    })
    .catch((err) => {
      next(err)
    })
    .finally(() => {
      /* to execute absolute necessary code */
      io.getIO().emit(socketEvents.deleteStreamRoom, {
        modelId: req.user.relatedUser._id,
        liveNow: io.decreaseLiveCount(req.user.relatedUser._id.toString()),
      })
    })
}

exports.handleViewerCallRequest = (req, res, next) => {
  // viewer must be authenticated
  // must have money >= min required

  const { modelId, streamId, callType } = req.body

  let theViewer
  const { socketId } = req.query

  /**
   * 🔻🔻 check for any pendingcall in viewer 🔺🔺
   */

  /* if (req.user.relatedUser.pendingCall) {
    return res.status(400).json({
      actionStatus: "failed",
      message: `You already have a pending ${req.user.relatedUser.pendingCallType}, if you wish to cancel that please go to you profile page.`
    })
  } */

  Promise.all([
    Wallet.findOne({ _id: req.user.relatedUser.wallet._id }).lean(),
    Model.findById(modelId)
      .select("charges minCallDuration isStreaming")
      .lean(),
    Viewer.findById(req.user.relatedUser._id)
      .select(
        "-streams -pendingCalls -privateChats -previousChatPlans -videoCallHistory -audioCallHistory"
      )
      .populate({
        path: "rootUser",
        select: "username",
      })
      .populate({
        path: "wallet",
      })
      .lean(),
  ])
    .then((values) => {
      const wallet = values[0]
      const model = values[1]
      theViewer = values[2]
      let minBalance

      if (callType === "audioCall") {
        minBalance = model.charges.audioCall * model.minCallDuration
      } else {
        minBalance = model.charges.videoCall * model.minCallDuration
      }

      if (wallet.currentAmount >= minBalance) {
        if (model?.isStreaming) {
          /* this will be sent to all the user in the stream model also */
          io.getIO()
            .in(`${streamId}-public`)
            .emit(chatEvents.viewer_requested_for_call_received, {
              callType: callType,
              username: req.user.username,
              profileImage: req.user.relatedUser.profileImage,
            })

          /* i'am sending custom event to the model with all the viewer details for her to do the analysis*/
          io.getIO()
            .in(`${modelId}-private`)
            .emit(`${chatEvents.viewer_requested_for_call_received}-private`, {
              callType: callType,
              username: req.user.username,
              /* later can also send viewers populated call history */
              viewer: theViewer,
            })

          return res.status(201).json({
            actionStatus: "success",
            message: `Request for ${callType} has been sent to the model, you will be notified when model accepts the call`,
          })
        } else {
          /* if not streaming */
          const error = new Error("The model is not currently streaming!")
          error.statusCode = 400
          throw error
        }
      } else {
        /* in sufficient balance */
        const error = new Error(
          `You do not have sufficient balance in your wallet to request ${callType}, ${minBalance} coins are required, you have   ${wallet.currentAmount} coins only`
        )
        error.statusCode = 400
        throw error
      }
    })
    .catch((err) => next(err))
}

exports.handleModelAcceptedCallRequest = (req, res, next) => {
  // this end point wil be called when model accepts the call request
  // this is just for updating call doc and emitting event

  if (!req.user.relatedUser.isStreaming) {
    return res.status(200).json({
      actionStatus: "failed",
      notStreaming: true,
      message: "You are not currently streaming",
    })
  }

  const { streamId, socketData } = req.body

  let { socketId } = req.query
  if (!socketId) {
    socketId = Array.from(
      io
        .getIO()
        .sockets.adapter.rooms.get(`${req.user.relatedUser._id}-private`)
    )?.[0]
  }

  /* 
    socketData schema => {
      response: response 
      callType: callType,
      relatedUserId: relatedUserId
      // by adding extra fields here
      username
      profileImage
    }
    
  */
  const callingViewerSocketData = {
    ...socketData,
  }
  const viewerId = req.body.socketData.relatedUserId
  const callType = req.body.socketData.callType

  let theCall = callType === "audioCall" ? AudioCall : VideoCall
  let callDoc
  const RENEW_BUFFER_TIME = 8 /* time after which the call will officially start */
  const callStartTimeStamp = Date.now() + RENEW_BUFFER_TIME * 1000
  callingViewerSocketData.callStartTs = callStartTimeStamp
  let canAffordNextMinute
  let modelTokenValidity

  /* create the call entry in DB */
  Promise.all([
    theCall.create({
      model: req.user.relatedUser._id,
      viewer: viewerId,
      stream: streamId,
      status: "model-accepted-will-end-stream",
      chargePerMin:
        callType === "audioCall"
          ? req.user.relatedUser.charges.audioCall
          : req.user.relatedUser.charges.videoCall,
      minCallDuration: req.user.relatedUser.minCallDuration,
      sharePercent: req.user.relatedUser.sharePercent,
      startTimeStamp: callStartTimeStamp /* plus five seconds */,
    }),
    Wallet.findOne({
      relatedUser: req.user.relatedUser._id,
    }),
    Wallet.findOne({ relatedUser: viewerId }),
    Stream.findById(streamId).lean().select("createdAt"),
  ])
    .then(([call, modelWallet, viewerWallet, stream]) => {
      /* deduct min charges from viewer and add to model wallet */
      callDoc = call
      callingViewerSocketData.callId = callDoc._id.toString()
      const minCharges = callDoc.chargePerMin * callDoc.minCallDuration

      if (viewerWallet.currentAmount - minCharges - callDoc.chargePerMin > 0) {
        /**
         * have money to afford next complete minute
         */
        canAffordNextMinute = true
      } else {
        /**
         * does not have money to afford next minute
         */
        canAffordNextMinute = false
        call.advanceCut = minCharges
        modelTokenValidity = Math.floor(
          (viewerWallet.currentAmount * 60) / callDoc.chargePerMin
        )
      }

      try {
        if (canAffordNextMinute) {
          viewerWallet.deductAmount(minCharges)
        } else {
          /**
           * generate token for all the amount in wallet
           * and cut all the money from viewer wallet as advance
           */
          call.advanceCut = viewerWallet.currentAmount
          viewerWallet.setAmount(0)
        }
      } catch (error) {
        theCall
          .deleteOne({
            _id: callDoc._id,
          })
          .catch(() => {
            console.error(
              "Viewer does not have sufficient amount of money for the call, and the call was also not deleted!"
            )
          })
          .finally(() => {
            return next(error)
          })
        return Promise.reject(
          "Viewer does not have sufficient amount of money for the call"
        )
      }
      modelWallet.addAmount(
        minCharges * (req.user.relatedUser.sharePercent / 100)
      )
      // rest add to the admin wallet
      // TODO: transfer coins to admin also 🔺🔻
      return Promise.all([
        modelWallet.save(),
        viewerWallet.save(),
        call.save(),
        Stream.updateOne(
          {
            _id: streamId,
          },
          {
            status: "ended",
            endReason: callType,
            duration: Math.round(
              (Date.now() - new Date(stream.createdAt).getTime()) / 1000
            ),
            endCall: {
              callId: call._id,
              callType: callType,
            },
          }
        ),
      ])
    })
    .then(([modelWallet, viewerWallet, call]) => {
      theCall = call

      /* update the local wallet of model */
      /* io.getIO()
        .in(`${req.user.relatedUser._id}-private`)
        .emit("model-wallet-updated", {
          modelId: req.user.relatedUser._id,
          operation: "set",
          amount: modelWallet.currentAmount,
        }) */

      /* add the call as pending call for both model and viewer */
      return Promise.all([
        Viewer.findOneAndUpdate(
          { _id: callDoc.viewer },
          {
            $push:
              callType === "AudioCall"
                ? { "pendingCalls.audioCalls": callDoc._id }
                : { "pendingCalls.videoCalls": callDoc._id },
          }
        )
          .select("profileImage name")
          .populate({
            path: "rootUser",
            select: "username",
          })
          .populate({
            path: "wallet",
          })
          .lean(),
        Model.updateOne(
          { _id: req.user.relatedUser._id },
          {
            $push:
              callType === "AudioCall"
                ? { "pendingCalls.audioCalls": callDoc._id }
                : { "pendingCalls.videoCalls": callDoc._id },
            isStreaming: false,
            currentStream: null,
            onCall: true,
          }
        ),
      ])
    })
    .then((result) => {
      const viewer = result[0]
      if (result[1].n !== 1) {
        console.error("Model status not updated in DB while accepting call.")
      }
      let socketDataUpdated = false
      try {
        let clientSocket = io.getIO().sockets.sockets.get(socketId)
        delete clientSocket.isStreaming
        delete clientSocket.streamId
        delete clientSocket.createdAt

        /* all the necessary details to do the billing in case of a disconnect */
        clientSocket.onCall = true
        clientSocket.callId = callDoc._id.toString()
        clientSocket.callType = callType
        clientSocket.sharePercent = +req.user.relatedUser.sharePercent

        socketDataUpdated = true
      } catch (err) {
        socketDataUpdated = false
      }

      /* inform all sockets about model response */
      io.getIO()
        .in(`${streamId}-public`)
        .except(`${viewerId}-private`)
        .except(`${req.user.relatedUser._id}-private`)
        .emit(chatEvents.model_call_request_response_received, {
          ...socketData,
          username: viewer.rootUser.username,
          profileImage: viewer.profileImage,
        })

      /* MAKE ALL OTHER CLIENTS EXCEPT THE MOdEL AND THE VIEWER LEAVE PUBLIC CHANNEL & destroy private channel 
        but leaving will be done from client side, later can kick user out from server 🔺🔺
      */

      /* make all viewers leave the public room */
      /* not destroying public channel for token gift to work on call */
      io.getIO()
        .in(`${streamId}-public`)
        .except(`${viewerId}-private`)
        .except(`${req.user.relatedUser._id}-private`)
        .socketsLeave(`${streamId}-public`)

      /**
       * for viewer
       */
      const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
        "model",
        viewerId.toString(),
        req.user.relatedUser._id.toString(),
        canAffordNextMinute
          ? callDoc.minCallDuration * 60 + RENEW_BUFFER_TIME
          : modelTokenValidity +
              60 /* anyway viewer token expiry is just for preventing extra "agora connection time", adding 60 so that model and viewers token expirey dont fire at the same time */,
        "sec"
      )

      /* EMIT TO THE CALLER VIEWER */
      callingViewerSocketData.username = viewer.rootUser.username
      io.getIO()
        .in(`${viewerId}-private`)
        .emit(chatEvents.model_call_request_response_received, {
          ...callingViewerSocketData,
          sharePercent: req.user.relatedUser.sharePercent,
          privilegeExpiredTs: privilegeExpiredTs,
          rtcToken: rtcToken,
          canAffordNextMinute,
        })

      /**
       * for the model
       */
      const modelToken = rtcTokenGenerator(
        "model",
        req.user.relatedUser._id.toString(),
        req.user.relatedUser._id.toString(),
        canAffordNextMinute
          ? callDoc.minCallDuration * 60 + RENEW_BUFFER_TIME
          : modelTokenValidity + RENEW_BUFFER_TIME,
        "sec"
      )

      redisClient.del(`${streamId}-public`, (err, response) => {
        if (err) {
          console.error("Redis delete err", err)
        }
        redisClient.del(`${streamId}-transactions`, (err, response) => {
          if (err) {
            console.error("Redis delete err", err)
          }
          console.log("Stream delete redis response:", response)
          return res.status(200).json({
            actionStatus: "success",
            viewerDoc: viewer,
            callDoc: callDoc,
            callStartTs: callStartTimeStamp /* not ISO, its in milliseconds */,
            socketDataUpdated: socketDataUpdated,
            sharePercent: +req.user.relatedUser.sharePercent,
            rtcToken: modelToken.rtcToken,
            privilegeExpiredTs: modelToken.privilegeExpiredTs,
            canAffordNextMinute,
            modelTokenValidity,
          })
        })
      })
    })
    .catch((err) => {
      if (typeof err !== "string") {
        return next(err)
      }
    })
}

exports.handleEndCallFromViewer = (req, res, next) => {
  const { callId, callType, endTimeStamp } = req.body

  let theCall
  const query =
    callType === "audioCall"
      ? Promise.all([
          AudioCall.updateOne(
            {
              _id: callId,
            },
            {
              $addToSet: { concurrencyControl: 1 },
            }
          ),
          AudioCall.findById(callId),
        ])
      : Promise.all([
          VideoCall.updateOne(
            {
              _id: callId,
            },
            {
              $addToSet: { concurrencyControl: 1 },
            }
          ),
          VideoCall.findById(callId),
        ])

  query
    .then(([lockResult, callDoc]) => {
      theCall = callDoc
      if (lockResult.nModified !== 1) {
        /**
         * processing of transaction for this call is already done
         */
        res.status(200).json({
          actionStatus: "failed",
          wasFirst: "no" /* was first to put the call end request */,
          message:
            "Model has ended the call before you, please wait while the transaction is processing!",
        })
        return Promise.reject(
          "Model has ended the call before you, please wait while the transaction is processing!"
        )
      }
      theCall = callDoc
      theCall.endTimeStamp = endTimeStamp
      theCall.endReason = "viewer-ended"
      theCall.status = "ended"
      const callDuration =
        (+endTimeStamp - theCall.startTimeStamp) / 1000 /* IN SECONDS */
      const callDurationMinutes = callDuration / 60

      theCall.callDuration = callDuration

      let viewerDeducted
      let modelGot
      if (theCall.advanceCut > theCall.minCallDuration * theCall.chargePerMin) {
        /**
         * means all the money from the viewer was
         * cut as advance, and the viewer has talked
         * as long as advance money lasted
         */
        viewerDeducted = theCall.advanceCut
        modelGot = theCall.advanceCut * (theCall.sharePercent / 100)
      } else {
        /**
         * viewer had the money for next minute
         */
        if (callDurationMinutes <= theCall.minCallDuration) {
          /* minCall duration charges only, not extra charges */
          viewerDeducted = theCall.minCallDuration * theCall.chargePerMin
          modelGot = viewerDeducted * (theCall.sharePercent / 100)
        } else {
          /* now charge over minCall duration */
          viewerDeducted = Math.ceil(callDuration / 60) * theCall.chargePerMin
          modelGot = viewerDeducted * (theCall.sharePercent / 100)
        }
      }

      return Promise.all([
        theCall.save(),
        Model.updateOne(
          {
            _id: theCall.model,
          },
          {
            isStreaming: false,
            onCall: false,
            currentStream: null,
            $pull:
              callType === "audioCall"
                ? { "pendingCalls.audioCalls": theCall._id }
                : { "pendingCalls.videoCalls": theCall._id },
            $addToSet:
              callType === "audioCall"
                ? { audioCallHistory: theCall._id }
                : { videoCallHistory: theCall._id },
          },
          { runValidators: true }
        ),
        Viewer.updateOne(
          {
            _id: theCall.viewer._id,
          },
          {
            $addToSet:
              callType === "audioCall"
                ? { audioCallHistory: theCall._id }
                : { videoCallHistory: theCall._id },
            $pull:
              callType === "audioCall"
                ? { "pendingCalls.audioCalls": theCall._id }
                : { "pendingCalls.videoCalls": theCall._id },
          },
          { runValidators: true }
        ),
        viewerDeducted,
        modelGot,
        Wallet.findOne({
          relatedUser: req.user.relatedUser._id,
        }).lean(),
        Wallet.findOne({
          relatedUser: theCall.model,
        }).lean(),
        CoinsSpendHistory({
          tokenAmount: viewerDeducted,
          forModel: theCall.model._id,
          by: theCall.viewer._id,
          sharePercent: theCall.sharePercent,
          givenFor:
            callType === "audioCall"
              ? coinsUses.AUDIO_CALL_COMPLETE
              : coinsUses.VIDEO_CALL_COMPLETE,
        }).save(),
      ])
    })
    .then(
      ([
        call,
        modelRes,
        viewerRes,
        viewerDeducted,
        modelGot,
        viewerWallet,
        modelWallet,
      ]) => {
        if (viewerRes.n + modelRes.n !== 2) {
          console.error(
            "Model or Viewer ware not updated correctly after the call end from viewer!"
          )
        }
        /**
         * emit to the model about call transaction completion
         */
        io.getIO()
          .in(`${theCall.model.toString()}-private`)
          .emit(chatEvents.viewer_call_end_request_finished, {
            theCall: theCall._doc,
            modelGot: modelGot,
            totalCharges: viewerDeducted,
            message: "Call was ended successfully by the model",
            ended: "ok",
            currentAmount: modelWallet.currentAmount,
          })

        return res.status(200).json({
          theCall: call,
          currentAmount: viewerWallet.currentAmount,
          totalCharges: viewerDeducted,
          actionStatus: "success",
          message: "call was ended successfully",
          wasFirst: "yes" /* was first to put the call end request */,
        })
      }
    )
    .catch((err) => {
      if (typeof err !== "string") {
        next(err)
      }
    })
    .finally(() => {
      /**
       * destroy the public channel
       */
      io.getIO()
        .in(`${theCall.stream.toString()}-public`)
        .socketsLeave(`${theCall.stream.toString()}-public`)

      /**
       * this model from live models list
       */
      io.getIO().emit(
        chatEvents.call_end,
        io.decreaseLiveCount(theCall.model._id.toString())
      )
    })
}

exports.handleEndCallFromModel = (req, res, next) => {
  const { callId, callType, endTimeStamp } = req.body

  let theCall
  const query =
    callType === "audioCall"
      ? Promise.all([
          AudioCall.updateOne(
            {
              _id: callId,
            },
            {
              $addToSet: { concurrencyControl: 1 },
            }
          ),
          AudioCall.findById(callId),
        ])
      : Promise.all([
          VideoCall.updateOne(
            {
              _id: callId,
            },
            {
              $addToSet: { concurrencyControl: 1 },
            }
          ),
          VideoCall.findById(callId),
        ])

  query
    .then(([lockResult, callDoc]) => {
      theCall = callDoc
      if (lockResult.nModified !== 1) {
        /**
         * processing of transaction for this call is already done
         */
        res.status(200).json({
          actionStatus: "failed",
          wasFirst: "no" /* was first to put the call end request */,
          message:
            "Viewer has ended the call before you, please wait while the transaction is processing!",
        })
        return Promise.reject(
          "Viewer has ended the call before you, please wait while the transaction is processing!"
        )
      }

      if (theCall.status !== "ongoing") {
        /**
         * It means the call was not setup properly from the viewer side
         * now refund the "advance" amount to the viewer
         */
        theCall.status = "ended"
        theCall.endReason = "viewer-network-error"

        const amountToRefundViewer = theCall.advanceCut
        const deductFromModel =
          amountToRefundViewer * (theCall.sharePercent / 100)

        console.error(
          "A call was not setup properly, hence refunding amt: ",
          amountToRefundViewer,
          " to the viewer"
        )

        return Promise.all([
          false,
          theCall.save(),
          Viewer.updateOne(
            {
              _id: theCall.viewer._id,
            },
            {
              $pull:
                callType === "audioCall"
                  ? { "pendingCalls.audioCalls": theCall._id }
                  : { "pendingCalls.videoCalls": theCall._id },
            }
          ),
          Model.updateOne(
            {
              _id: theCall.model._id,
            },
            {
              $pull:
                callType === "audioCall"
                  ? { "pendingCalls.audioCalls": theCall._id }
                  : { "pendingCalls.videoCalls": theCall._id },
              onCall: false,
              isStreaming: false,
              currentStream: null,
            }
          ),
          amountToRefundViewer,
          deductFromModel,
          Wallet.updateOne(
            {
              relatedUser: theCall.viewer._id,
            },
            {
              $inc: { currentAmount: amountToRefundViewer },
            }
          ),
          Wallet.updateOne(
            {
              relatedUser: theCall.model._id,
            },
            {
              $inc: { currentAmount: -deductFromModel },
            }
          ),
          CoinsSpendHistory({
            tokenAmount: amountToRefundViewer,
            forModel: theCall.model._id,
            by: theCall.viewer._id,
            sharePercent: theCall.sharePercent,
            givenFor: coinsUses.VIEWER_REFUND,
          }).save(),
          /* DELETE THE CALL ALSO */
        ])
      } else {
        /**
         * if call was setup properly
         */
        theCall = callDoc
        theCall.endTimeStamp = endTimeStamp
        theCall.endReason = "model-ended"
        theCall.status = "ended"

        const callDuration =
          (+endTimeStamp - theCall.startTimeStamp) / 1000 /* IN SECONDS */
        const callDurationMinutes = callDuration / 60

        theCall.callDuration = callDuration

        let viewerDeducted
        let modelGot

        if (
          theCall.advanceCut >
          theCall.minCallDuration * theCall.chargePerMin
        ) {
          /**
           * means all the money from the viewer was
           * cut as advance, and the viewer has talked
           * as long as advance money lasted
           */
          viewerDeducted = theCall.advanceCut
          modelGot = theCall.advanceCut * (theCall.sharePercent / 100)
        } else {
          /**
           * viewer had the money for next minute
           */
          if (callDurationMinutes <= theCall.minCallDuration) {
            /* minCall duration charges only, not extra charges */
            viewerDeducted = theCall.minCallDuration * theCall.chargePerMin
            modelGot = viewerDeducted * (theCall.sharePercent / 100)
          } else {
            /* now charge over minCall duration */
            viewerDeducted = Math.ceil(callDuration / 60) * theCall.chargePerMin
            modelGot = viewerDeducted * (theCall.sharePercent / 100)
          }
        }

        return Promise.all([
          true,
          theCall.save(),
          Viewer.updateOne(
            {
              _id: theCall.viewer._id,
            },
            {
              $addToSet:
                callType === "audioCall"
                  ? { audioCallHistory: theCall._id }
                  : { videoCallHistory: theCall._id },
              $pull:
                callType === "audioCall"
                  ? { "pendingCalls.audioCalls": theCall._id }
                  : { "pendingCalls.videoCalls": theCall._id },
            },
            { runValidators: true }
          ),
          Model.updateOne(
            {
              _id: theCall.model,
            },
            {
              isStreaming: false,
              onCall: false,
              currentStream: null,
              $pull:
                callType === "audioCall"
                  ? { "pendingCalls.audioCalls": theCall._id }
                  : { "pendingCalls.videoCalls": theCall._id },
              $addToSet:
                callType === "audioCall"
                  ? { audioCallHistory: theCall._id }
                  : { videoCallHistory: theCall._id },
            },
            { runValidators: true }
          ),
          viewerDeducted,
          modelGot,
          Wallet.findOne({
            relatedUser: theCall.viewer,
          }).lean(),
          Wallet.findOne({
            relatedUser: req.user.relatedUser._id,
          }).lean(),
          CoinsSpendHistory({
            tokenAmount: viewerDeducted,
            forModel: theCall.model._id,
            by: theCall.viewer._id,
            sharePercent: theCall.sharePercent,
            givenFor:
              callType === "audioCall"
                ? coinsUses.AUDIO_CALL_COMPLETE
                : coinsUses.VIDEO_CALL_COMPLETE,
          }).save(),
        ])
      }
    })
    .then((result) => {
      if (!result[0]) {
        /**
         * if call was not setup properly
         */
        const [
          callSetUpProperly,
          call,
          viewerRes,
          modelRes,
          amountToRefundViewer,
          deductFromModel,
          vWalletRes,
          mWalletRes,
        ] = result

        theCall = call
        if (viewerRes.n + modelRes.n !== 2) {
          console.error(
            "Model or Viewer ware not updated correctly after the call end from viewer!"
          )
        }

        /**
         * emit to the viewer about call transaction compeletion, with error
         */
        io.getIO()
          .in(`${theCall.viewer._id}-private`)
          .emit(chatEvents.model_call_end_request_finished, {
            theCall: theCall._doc,
            amountToRefund: amountToRefundViewer,
            message:
              "Call was not connected properly hence your money is refunded",
            ended: "not-setuped-properly",
          })

        return res.status(200).json({
          actionStatus: "success",
          wasFirst: "yes",
          callWasNotSetupProperly: callSetUpProperly,
        })
      } else {
        const [
          callSetUpProperly,
          call,
          viewerRes,
          modelRes,
          viewerDeducted,
          modelGot,
          viewerWallet,
          modelWallet,
        ] = result

        theCall = call
        if (viewerRes.n + modelRes.n !== 2) {
          console.error(
            "Model or Viewer ware not updated correctly after the call end from viewer!"
          )
        }

        /**
         * emit to the viewer about call transaction compeletion
         */
        io.getIO()
          .in(`${theCall.stream._id.toString()}-public`)
          .emit(chatEvents.model_call_end_request_finished, {
            theCall: theCall._doc,
            modelGot: modelGot,
            totalCharges: viewerDeducted,
            message: "Call was ended successfully by the model",
            ended: "ok",
            currentAmount: viewerWallet.currentAmount,
          })

        return res.status(200).json({
          theCall: theCall,
          currentAmount: modelWallet.currentAmount,
          modelGot: modelGot,
          totalCharges: viewerDeducted,
          actionStatus: "success",
          message: "call was ended successfully",
          wasFirst: "yes",
          wallet: modelWallet,
          callWasNotSetupProperly: false,
        })
      }
    })
    .finally(() => {
      /**
       * destroy the public channel
       */
      io.getIO()
        .in(`${theCall.stream.toString()}-public`)
        .socketsLeave(`${theCall.stream.toString()}-public`)

      /**
       * remove this model from live models list
       */
      io.getIO().emit(
        chatEvents.call_end,
        io.decreaseLiveCount(req.user.relatedUser._id.toString())
      )
    })

  /**
   * 1. remove this call from pending calls of viewer & model
   * 2. bill & debit the amount respectively
   * 3. write meta data to the call record and close
   * 4. change model status
   * 5. destroy chat channels
   */
}

exports.setCallOngoing = (req, res, next) => {
  /**
   * set the status of the call as ongoing
   */

  const { callId, callType } = req.body
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

  const query =
    callType === "audioCall"
      ? AudioCall.findById(callId).lean()
      : VideoCall.findById(callId).lean()

  let callDoc
  query
    .then((call) => {
      if (call) {
        callDoc = call
        if (
          call.viewer._id.toString() === req.user.relatedUser._id.toString() &&
          !call.endTimeStamp &&
          call.status !== "ongoing" &&
          !call.concurrencyControl.includes(1)
        ) {
          /* if the same viewers as embeded in the call doc */
          return callType === "audioCall"
            ? AudioCall.findById(callId).updateOne(
                {
                  _id: callId,
                },
                {
                  status: "ongoing",
                }
              )
            : VideoCall.findById(callId).updateOne(
                {
                  _id: callId,
                },
                {
                  status: "ongoing",
                }
              )
        } else {
          /* if someone else  */
          const err = new Error(
            "This call does not belongs to you or is already completed, or if you think this is a problem from our side contact the admin."
          )
          err.statusCode = 400
          throw err
        }
      }
      /* if call doc does not exists */
      const err = new Error("Call does not exist.")
      err.statusCode = 400
      throw err
    })
    .then((result) => {
      /* update the client socket and reflect the ongoing call */
      let socketUpdated = false
      try {
        delete clientSocket.onStream
        delete clientSocket.streamId

        clientSocket.onCall = true
        clientSocket.callId = callDoc._id.toString()
        clientSocket.callType = callType
        clientSocket.sharePercent = +callDoc.sharePercent

        socketUpdated = true
      } catch (err) {
        socketUpdated = false
      }

      if (result.n === 1) {
        /* if only the status was updated */
        return res.status(200).json({
          actionStatus: "success",
          socketUpdated: socketUpdated,
          sharePercent: callDoc.sharePercent,
        })
      }
    })
    .catch((err) => next(err))
}

exports.setOngoing = (req, res, next) => {
  // endpoint to handle request of stream status update
  //   const { streamId, modelId } = req.body

  Model.findById(req.user.relatedUser._id)
    .select("currentStream isStreaming")
    .then(
      (model) => {
        Stream.findOneAndUpdate(
          {
            _id: model.currentStream._id,
          },
          {
            status: "ongoing",
          }
        )
      },
      { new: true }
    )
    .select("status")
    .lean()
    .then((stream) => {
      if (stream.status === "ongoing") {
        res.status(200).json({
          message: "stream status set to ongoing, you are live to everyone now",
          actionStatus: "success",
        })
      }
    })
    .catch((err) => next(err))
}

exports.viewerFollowModel = (req, res, next) => {
  /* will trigger when viewer clicks on the heart button on the stream of the model */
  /* check if the model is approved and the user is logged in*/

  const { modelId } = req.body

  if (req.user.userType !== "Viewer") {
    return res.status(200).json({
      actionStatus: "failed",
      message: "Only viewers can follow the models!",
    })
  }

  let alreadyFollowing = false
  let viewerData = {}
  Viewer.findOneAndUpdate(
    {
      _id: req.user.relatedUser._id,
    },
    {
      $addToSet: { following: modelId },
    }
  )
    .lean()
    .select("name profileImage following")
    .then((viewer) => {
      if (!viewer.following.includes(req.user.relatedUser._id)) {
        /* was not already following, Follow the model */
        viewerData = {
          name: viewer.name,
          _id: viewer._id,
          profileImage: viewer.profileImage,
        }
        return Promise.all([
          Model.findOneAndUpdate(
            {
              _id: modelId,
            },
            {
              $inc: { numberOfFollowers: 1 },
            },
            {
              new: true,
            }
          )
            .lean()
            .select("numberOfFollowers"),
        ])
      } else {
        /* was already in array, unFollow model */
        alreadyFollowing = true
        return Promise.all([
          Model.findOneAndUpdate(
            {
              _id: modelId,
            },
            {
              $inc: { numberOfFollowers: -1 },
            },
            {
              new: true,
            }
          )
            .lean()
            .select("numberOfFollowers"),
          Viewer.updateOne(
            {
              _id: req.user.relatedUser._id,
            },
            {
              $pull: { following: modelId },
            }
          ),
        ])
      }
    })
    .then((result) => {
      if (alreadyFollowing) {
        return res.status(200).json({
          actionStatus: "success",
          message: "You are now not following this model.",
          action: "un-followed",
          newCount: result[0].numberOfFollowers,
        })
      } else {
        Notifier.newModelNotification("viewer-follow", modelId, viewerData)
        return res.status(200).json({
          actionStatus: "success",
          message: "You are now following this model.",
          action: "follow",
          newCount: result[0].numberOfFollowers,
        })
      }
    })
    .catch((err) => {
      if (!err?.message) {
        err.message = "Model was not followed successfully!"
      }
      next(err)
    })
}

exports.unFollowModel = (req, res, next) => {
  if (req.user.userType !== "Viewer") {
    return res.status(200).json({
      actionStatus: "failed",
      message: "Only viewers can Un-follow the models!",
    })
  }
}

exports.processTokenGift = (req, res, next) => {
  /* handle the gifting of token by the user to model */

  var { modelId, tokenAmount, socketData } = req.body

  tokenAmount = +tokenAmount

  let sharePercent
  let viewerNewWalletAmount
  let streamId
  Wallet.findOne({ rootUser: req.user._id })
    .then((wallet) => {
      if (tokenAmount <= wallet.currentAmount) {
        const amountLeft = wallet.currentAmount - tokenAmount
        viewerNewWalletAmount = amountLeft
        wallet.currentAmount = amountLeft
        return wallet.save()
      } else {
        const error = new Error(
          `You dont have sufficient amount of coins to gift the model, ${tokenAmount} is required you have only ${wallet.currentAmount}`
        )
        error.statusCode = 400
        throw error
      }
    })
    .then(() => {
      /* transfer the amount to model*/
      return Model.findById(modelId).select("sharePercent currentStream").lean()
    })
    .then((model) => {
      sharePercent = model?.sharePercent
      try {
        streamId = model.currentStream._id.toString()
      } catch (e) {
        /* model not streaming */
      }
      if (!sharePercent) {
        sharePercent = 60
      }
      return Promise.all([
        Wallet.updateOne(
          { relatedUser: modelId },
          {
            $inc: { currentAmount: tokenAmount * (sharePercent / 100) },
          }
        ),
        Viewer.findById(req.user.relatedUser._id)
          .lean()
          .select("name profileImage")
          .populate("rootUser", "username"),
      ])
    })
    .then(([_r, viewer]) => {
      req.user.username = viewer.rootUser.username
      req.user.relatedUser.name = viewer.name
      req.user.relatedUser.profileImage = viewer.profileImage
      io.getIO()
        .in(`${modelId}-private`)
        .emit("model-wallet-updated", {
          modelId: modelId,
          operation: "add",
          amount: tokenAmount * (sharePercent / 100),
        })
      if (streamId) {
        /* save a notification */
        Notifier.newModelNotification("viewer-coins-gift", modelId, {
          viewer: viewer,
          modelGot: tokenAmount * (sharePercent / 100),
          amount: tokenAmount,
        })
      }
      return CoinsSpendHistory({
        tokenAmount: tokenAmount,
        forModel: modelId,
        by: req.user.relatedUser._id,
        sharePercent: sharePercent,
        givenFor: coinsUses.ON_STREAM_COINS,
      }).save()
    })
    .then(() => {
      /* save data in firebase */
      if (streamId) {
        const path = `publicChats/${streamId}`
        return getDatabase().ref(path).child("chats").push(socketData)
      } else {
        return Promise.resolve("Model not streaming")
      }
    })
    .then((value) => {
      // const clientSocket = io.getIO().sockets.sockets.get(socketId)
      if (value !== "Model not streaming") {
        redisClient.get(`${streamId}-transactions`, (err, transactions) => {
          /**
           * transactions = [
           *  {
           *    viewerId:_id,
           *    spent:Number
           *  }
           * ]
           */
          if (transactions && !err) {
            transactions = JSON.parse(transactions).map((entry) => ({
              ...entry,
              spent: +entry.spent,
            }))
            if (transactions?.[0]) {
              /**
               * if not the first one, check if this user is already in the list
               */
              const thisUserTransactions = transactions.find(
                (item) => item.viewerId === req.user.relatedUser._id
              )
              if (thisUserTransactions) {
                /**
                 * if user has already spent, check if more than existing max
                 */
                thisUserTransactions.spent =
                  thisUserTransactions.spent + tokenAmount
                if (thisUserTransactions.spent > transactions[0].spent) {
                  /**
                   * spent more than king, check he's already a king
                   */
                  if (
                    transactions[0].viewerId === thisUserTransactions.viewerId
                  ) {
                    /**
                     * this is already king of room, no sorting required as this viewer is already on top
                     */
                    transactions = JSON.stringify(transactions)
                  } else {
                    /**
                     * new king, notify everyone
                     */
                    io.getIO()
                      .in(`${streamId}-public`)
                      .emit("new-king", thisUserTransactions)
                    transactions.sort((t1, t2) => {
                      return t2.spent - t1.spent
                    })
                    transactions = JSON.stringify(transactions)
                  }
                } else {
                  /**
                   * not topped the king yet
                   */
                  transactions.sort((t1, t2) => {
                    return t2.spent - t1.spent
                  })
                  transactions = JSON.stringify(transactions)
                }
              } else {
                /**
                 * if users first gift in the room
                 */
                if (tokenAmount >= transactions[0].spent) {
                  /* new king, beat king in one donation */
                  io.getIO().in(`${streamId}-public`).emit("new-king", {
                    viewerId: req.user.relatedUser._id,
                    username: req.user.username,
                    profileImage: req.user.relatedUser.profileImage,
                    spent: tokenAmount,
                  })
                }
                transactions.push({
                  viewerId: req.user.relatedUser._id,
                  username: req.user.username,
                  profileImage: req.user.relatedUser.profileImage,
                  spent: tokenAmount,
                })
                transactions.sort((t1, t2) => {
                  return t2.spent - t1.spent
                })
                transactions = JSON.stringify(transactions)
              }
            } else {
              /**
               * if first viewer to gift token
               */
              transactions = JSON.stringify([
                {
                  viewerId: req.user.relatedUser._id,
                  username: req.user.username,
                  profileImage: req.user.relatedUser.profileImage,
                  spent: tokenAmount,
                },
              ])
              io.getIO().in(`${streamId}-public`).emit("new-king", {
                viewerId: req.user.relatedUser._id,
                username: req.user.username,
                profileImage: req.user.relatedUser.profileImage,
                spent: tokenAmount,
              })
            }

            redisClient.set(`${streamId}-transactions`, transactions, (err) => {
              if (!err) {
                io.getIO()
                  .in(socketData.room)
                  .emit(
                    chatEvents.viewer_super_message_public_received,
                    socketData
                  )
                return res.status(200).json({
                  actionStatus: "success",
                  viewerNewWalletAmount: viewerNewWalletAmount,
                })
              }
            })
          } else {
            return next(err)
          }
        })
      } else {
        return res.status(200).json({
          actionStatus: "success",
          viewerNewWalletAmount: viewerNewWalletAmount,
        })
      }
    })
    .catch((error) => next(error))
}

exports.processTipMenuRequest = (req, res, next) => {
  controllerErrorCollector(req)
  let { activity, modelId, socketData, room } = req.body

  let sharePercent
  let viewerNewWalletAmount
  let streamId
  Promise.all([
    Wallet.findOne({ rootUser: req.user._id }),
    Model.findById(modelId)
      .select("sharePercent currentStream tipMenuActions")
      .lean(),
    Viewer.findById(req.user.relatedUser._id)
      .select("name profileImage")
      .populate("rootUser")
      .lean(),
  ])
    .then(([wallet, model, viewer]) => {
      req.user.username = viewer.rootUser.username
      req.user.relatedUser.name = viewer.name
      req.user.relatedUser.profileImage = viewer.profileImage
      activity = model.tipMenuActions.actions.find(
        (action) => action._id.toString() === activity._id
      )
      if (!activity) {
        throw new Error("Invalid Activity!")
      }
      if (activity.price <= wallet.currentAmount) {
        const amountLeft = wallet.currentAmount - activity.price
        viewerNewWalletAmount = amountLeft
        wallet.currentAmount = amountLeft

        sharePercent = model.sharePercent
        streamId = model.currentStream?._id

        const promiseArray = [
          Wallet.updateOne(
            { relatedUser: modelId },
            {
              $inc: { currentAmount: activity.price * (sharePercent / 100) },
            }
          ),
          CoinsSpendHistory({
            tokenAmount: activity.price,
            forModel: modelId,
            by: req.user.relatedUser._id,
            sharePercent: sharePercent,
            givenFor: coinsUses.ON_STREAM_ACTIVITY,
          }).save(),
          wallet.save(),
        ]

        if (streamId) {
          /* save data in firebase */
          const path = `publicChats/${streamId}`
          promiseArray.push(
            getDatabase().ref(path).child("chats").push(socketData)
          )
        }
        return promiseArray
      } else {
        const error = new Error(
          `You dont have sufficient amount of coins to gift the model, ${activity.price} coins are required you have only ${wallet.currentAmount} coins`
        )
        error.statusCode = 400
        throw error
      }
    })
    .then(() => {
      if (streamId) {
        redisClient.get(`${streamId}-transactions`, (err, transactions) => {
          /**
           * transactions = [
           *  {
           *    viewerId:_id,
           *    ...
           *    spent:Number
           *  }
           * ]
           */
          if (transactions && !err) {
            transactions = JSON.parse(transactions).map((entry) => ({
              ...entry,
              spent: +entry.spent,
            }))
            if (transactions?.[0]) {
              /**
               * if not the first one, check if this user is already in the list
               */
              const thisUserTransactions = transactions.find(
                (item) => item.viewerId === req.user.relatedUser._id
              )
              if (thisUserTransactions) {
                /**
                 * if user has already spent, check if more than existing max
                 */
                thisUserTransactions.spent += activity.price
                if (thisUserTransactions.spent > transactions[0].spent) {
                  /**
                   * spent more than king, check he's already a king
                   */
                  if (
                    transactions[0].viewerId === thisUserTransactions.viewerId
                  ) {
                    /**
                     * this is already king of room, no sorting required as this viewer is already on top
                     */
                    transactions = JSON.stringify(transactions)
                  } else {
                    /**
                     * new king, notify everyone
                     */
                    io.getIO()
                      .in(`${streamId}-public`)
                      .emit("new-king", thisUserTransactions)
                    transactions.sort((t1, t2) => {
                      t2.spent - t1.spent
                    })
                    transactions = JSON.stringify(transactions)
                  }
                } else {
                  /**
                   * not topped the king yet
                   */
                  transactions.sort((t1, t2) => {
                    t2.spent - t1.spent
                  })
                  transactions = JSON.stringify(transactions)
                }
              } else {
                /**
                 * if users first gift in the room
                 */
                if (activity.price >= transactions[0].spent) {
                  /* new king, beat king in one donation */
                  io.getIO().in(`${streamId}-public`).emit("new-king", {
                    viewerId: req.user.relatedUser._id,
                    username: req.user.username,
                    profileImage: req.user.relatedUser.profileImage,
                    spent: activity.price,
                  })
                }
                transactions.push({
                  viewerId: req.user.relatedUser._id,
                  username: req.user.username,
                  profileImage: req.user.relatedUser.profileImage,
                  spent: activity.price,
                })
                transactions.sort((t1, t2) => {
                  t2.spent - t1.spent
                })
                transactions = JSON.stringify(transactions)
              }
            } else {
              /**
               * if first viewer to gift token
               */
              transactions = JSON.stringify([
                {
                  viewerId: req.user.relatedUser._id,
                  username: req.user.username,
                  profileImage: req.user.relatedUser.profileImage,
                  spent: activity.price,
                },
              ])
              io.getIO().in(`${streamId}-public`).emit("new-king", {
                viewerId: req.user.relatedUser._id,
                username: req.user.username,
                profileImage: req.user.relatedUser.profileImage,
                spent: activity.price,
              })
            }

            redisClient.set(`${streamId}-transactions`, transactions, (err) => {
              if (!err) {
                io.getIO()
                  .in(`${modelId}-private`)
                  .emit("model-wallet-updated", {
                    modelId: modelId,
                    operation: "add",
                    amount: activity.price * (sharePercent / 100),
                  })

                io.getIO()
                  .in(room)
                  .emit(
                    chatEvents.viewer_super_message_public_received,
                    socketData
                  )

                return res.status(200).json({
                  actionStatus: "success",
                  viewerNewWalletAmount: viewerNewWalletAmount,
                })
              } else {
                throw err
              }
            })
          } else {
            return next(err)
          }
        })
      } else {
        return res.status(200).json({
          actionStatus: "success",
          viewerNewWalletAmount: viewerNewWalletAmount,
        })
      }
    })
    .catch((error) => next(error))
}

exports.buyChatPlan = (req, res, next) => {
  /* verify is viewer and loggedIn */
  /* check is already active he cannot buy again */

  /* ==========OBSOLETE============ */

  const { planId } = req.body

  Promise.all([
    Wallet.findOne({ rootUser: req.user._id }),
    Viewer.findById(req.user.relatedUser._id).select(
      "isChatPlanActive currentChatPlan previousChatPlans"
    ),
    PrivateChatPlan.findById(planId),
  ])
    .then((values) => {
      const wallet = viewer
      const viewer = values[1]
      const plan = values[2]

      if (plan) {
        if (wallet.currentAmount >= plan.price) {
          if (!viewer.isChatPlanActive) {
            viewer.currentChatPlan = {
              planId: planId,
              willExpireOn: plan.validityDays * 24 * 3600 * 1000 + Date.now(),
              purchasedOn: new Date(),
            }
            const newPlans = [
              ...viewer.previousChatPlans,
              {
                planId: planId,
                purchasedOn: new Date(),
                index: viewer.previousChatPlans + 1,
              },
            ]
            viewer.previousChatPlans = newPlans
            viewer.isChatPlanActive = true

            /* deduct money from wallet */
            const newWalletAmount = wallet.currentAmount - plan.price
            wallet.currentAmount = newWalletAmount

            return Promise.all([viewer.save(), wallet.save()])
          }
          const error = new Error("You already have an active chat plan! 😎😎")
          error.statusCode = 400
          throw error
        }
        const error = new Error(
          "You don't have sufficient amount of money in the wallet to buy his plan! 😢😢😭😭"
        )
        error.statusCode = 400
        throw error
      }
      const error = new Error("Invalid Plan, does not exists!")
      error.statusCode = 400
      throw error
    })
    .then((viewer) => {
      // if (viewer.isChatPlanActive) {
      // }
    })
}

exports.getChatPlans = (req, res, next) => {
  PrivateChatPlan.find()
    .then((plans) => {
      res.status(200).json({
        actionStatus: "success",
        plans: plans,
      })
    })
    .catch((err) => {
      if (err?.message) {
        err.message = "Unable to fetch message!"
      }
      return next(err)
    })
}

exports.getTipMenuActions = (req, res, next) => {
  /* for viewers */
  const { modelId } = req.body
  Model.findById(modelId)
    .select("tipMenuActions")
    .lean()
    .then((model) => {
      res.status(200).json({
        actionStatus: "success",
        tips: model.tipMenuActions.actions,
      })
    })
    .catch((err) => next(err))
}

exports.getForCallDetails = (req, res, next) => {
  /* get call meta details of the viewer for the model */
  const { modelId } = req.body

  Model.findById(modelId)
    .select("charges minCallDuration isStreaming onCall")
    .then((model) => {
      return res.status(200).json({
        actionStatus: "success",
        details: model,
      })
    })
}

exports.reJoinModelsCurrentStreamAuthed = async (req, res, next) => {
  /* join models current stream even when he quits and restarts */
  /* NOTE: at this sage the viewer already has the rtcToken */

  const { modelId, getNewToken } = req.body
  let { socketId } = req.query

  if (!socketId) {
    try {
      socketId = Array.from(
        io
          .getIO()
          .sockets.adapter.rooms.get(`${req.user.relatedUser._id}-private`)
      )[0]
    } finally {
      console.info("socketId not found even from private room")
    }
  }

  try {
    var [model, viewer] = await Promise.all([
      Model.findById(modelId).select("currentStream isStreaming").lean(),
      Viewer.findById(req.user.relatedUser._id)
        .lean()
        .select("name isChatPlanActive profileImage")
        .populate({
          path: "wallet",
          select: "currentAmount",
          options: { lean: true },
        })
        .populate({
          path: "rootUser",
          select: "username",
          options: { lean: true },
        }),
    ])

    /**
     * all the viewers will rejoin on the same will over whelm the system
     * so dont't emit during rejoin only emit to the model
     */
    if (model.isStreaming) {
      /* if model is streaming */

      /**
       * no need to emit this 👇 to model,she can get all viewers when fetching live viewers count
       */

      // io.getIO()
      //   .in(`${modelId}-private`)
      //   .emit(`${socketEvents.viewerJoined}-private`, {
      //     // roomSize: roomSize, /* hey model ask the room size with a http request after a time gap  */
      //     reJoin: true /* hey, model if rejoin then don't update live count*/,
      //     relatedUserId: req.user.relatedUser._id,
      // })

      /**
       * ============
       * user joined event will not be fired as it will overwhelm
       * hence all the users will ask the live users count after a delay
       * with a seprate http or socket request
       * ============
       */

      let socketUpdated = false
      try {
        const clientSocket = io.getIO().sockets.sockets.get(socketId)
        clientSocket.onStream = true
        clientSocket.streamId = model.currentStream._id.toString()
        /* join the public channel */
        clientSocket.join(`${model.currentStream._id}-public`)
        /* deliberately making him rejoin just incase he has left the channel */
        clientSocket.join(`${req.user.relatedUser._id}-private`)
        socketUpdated = true
      } catch (err) {
        socketUpdated = false
      }

      /**
       * REDIS-->
       */
      redisClient.get(`${model.currentStream._id}-public`, (err, viewers) => {
        const myViewers = JSON.parse(viewers)
        /**
         * check is viewer is already in the list
         */
        if (
          !myViewers.find((viewer) => viewer._id === req.user.relatedUser._id)
        ) {
          myViewers.push({
            ...viewer,
            username: viewer.rootUser.username,
            walletCoins: viewer.wallet.currentAmount,
          })
          viewers = JSON.stringify(myViewers)
        }
        redisClient.set(`${model.currentStream._id}-public`, viewers, (err) => {
          if (!err) {
            // send the response
            if (getNewToken) {
              const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                "viewer",
                req.user.relatedUser._id,
                modelId
              )
              return res.status(200).json({
                actionStatus: "success",
                isChatPlanActive: viewer.isChatPlanActive,
                streamId: model.currentStream._id,
                socketUpdated: socketUpdated,
                privilegeExpiredTs: privilegeExpiredTs,
                rtcToken: rtcToken,
                liveViewersList: myViewers,
              })
            } else {
              return res.status(200).json({
                actionStatus: "success",
                isChatPlanActive: viewer.isChatPlanActive,
                streamId: model.currentStream._id,
                socketUpdated: socketUpdated,
                liveViewersList: viewers,
              })
            }
          } else {
            return next(err)
          }
        })
      })
    } else {
      return res.status(200).json({
        actionStatus: "failed",
        message: "This model is currently no streaming, please comeback later.",
        isChatPlanActive: viewer.isChatPlanActive,
      })
    }
  } catch (e) {
    const err = new Error(e.message + "Stream chats not joined")
    err.statusCode = 500
    return next(err)
  }
}

exports.reJoinModelsCurrentStreamUnAuthed = (req, res, next) => {
  const { modelId, unAuthedUserId, getNewToken } = req.body
  const { socketId } = req.query

  Model.findById(modelId)
    .select("currentStream isStreaming")
    .lean()
    .then((model) => {
      if (!model) {
        const err = new Error("Invalid model id, model does not exists!")
        err.statusCode = 422
        throw err
      }
      if (model.isStreaming) {
        redisClient.get(`${model.currentStream._id}-public`, (err, viewers) => {
          if (!err) {
            viewers = JSON.parse(viewers)
            viewers.push({
              unAuthed: true,
            })
            viewers = JSON.stringify(viewers)
            redisClient.set(
              `${model.currentStream._id}-public`,
              viewers,
              (err) => {
                if (!err) {
                  /**
                   * ============
                   * user joined event will not be fired as it will overwhelm
                   * hence all the users will ask the live users count after a delay
                   * with a seprate http or socket request
                   * ============
                   */
                  let socketUpdated = false
                  try {
                    const clientSocket = io
                      .getIO()
                      .sockets.sockets.get(socketId)
                    clientSocket.join(`${model.currentStream._id}-public`)
                    clientSocket.onStream = true
                    clientSocket.streamId = model.currentStream._id.toString()
                    socketUpdated = true
                  } catch (err) {
                    socketUpdated = false
                  }

                  if (getNewToken) {
                    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                      "unAuthed",
                      unAuthedUserId,
                      modelId
                    )
                    return res.status(200).json({
                      actionStatus: "success",
                      streamId: model.currentStream._id,
                      socketUpdated: socketUpdated,
                      privilegeExpiredTs: privilegeExpiredTs,
                      rtcToken: rtcToken,
                    })
                  } else {
                    return res.status(200).json({
                      actionStatus: "success",
                      streamId: model.currentStream._id,
                      socketUpdated: socketUpdated,
                    })
                  }
                } else {
                  /* err */
                  console.error("Redis set error", err)
                  return next(err)
                }
              }
            )
          } else {
            /* redis err */
            console.error("Redis get error", err)
            return next(err)
          }
        })
      } else {
        return res.status(400).json({
          actionStatus: "failed",
          message:
            "This model is currently not streaming, please comeback later.",
        })
      }
    })
    .catch((err) => next(err))
}

exports.getLiveRoomCount = (req, res, next) => {
  /**
   * return the live viewer count in a socket room
   */
  const { room } = req.params

  redisClient.get(room, (err, viewers) => {
    if (err) {
      return console.error(err)
    }
    return res.status(200).json({
      roomSize: io.getIO().sockets.adapter.rooms.get(room)?.size,
      viewersList: viewers,
    })
  })
}

exports.getAViewerDetails = (req, res, next) => {
  const { viewerId } = req.params
  Viewer.findById(viewerId)
    .populate({
      path: "rootUser",
      select: "username",
    })
    .populate({
      path: "wallet",
      select: "currentAmount",
    })
    .lean()
    .select("name profileImage rootUser wallet isChatPlanActive")
    .then((viewer) => {
      return res.status(200).json({
        actionStatus: "success",
        viewer: {
          _id: viewerId,
          name: viewer.name,
          username: viewer.rootUser.username,
          walletCoins: viewer.wallet.currentAmount,
          profileImage: viewer.profileImage,
          isChatPlanActive: viewer.isChatPlanActive,
        },
      })
    })
}
