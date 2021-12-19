const AudioCall = require("../../models/globals/audioCall")
const Stream = require("../../models/globals/Stream")
const CoinsSpendHistory = require("../../models/globals/coinsSpendHistory")
const coinsUses = require("../../utils/coinsUseCaseStrings")
const VideoCall = require("../../models/globals/videoCall")
const Wallet = require("../../models/globals/wallet")
const Model = require("../../models/userTypes/Model")
const Viewer = require("../../models/userTypes/Viewer")
const io = require("../../socket")
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
      }
    ),
    Stream.findById(streamId),
  ])
    .then(([model, stream]) => {
      if (
        stream.status !== "ended" &&
        model.isStreaming &&
        model.currentStream
      ) {
        io.getIO().emit(socketEvents.deleteStreamRoom, {
          modelId: req.user.relatedUser._id,
          liveNow: io.decreaseLiveCount(req.user.relatedUser._id.toString()),
        })
        const duration =
          (new Date().getTime() - new Date(stream.createdAt).getTime()) /
          60000 /* in minutes */
        stream.endReason = "Manual"
        stream.status = "ended"
        stream.meta.set("duration", duration)

        /* emit to all about delete stream room */
        return Promise.all([
          stream.save(),
          getDatabase().ref("publicChats").child(streamId).remove(),
        ])
      } else {
        const error = new Error(
          "Stream is already ended and models was not streaming"
        )
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
            )[0]
          )
      }

      /* remove previous streams attributes from socket client */
      clientSocket.isStreaming = false
      clientSocket.streamId = null

      /* destroy the stream chat rooms, heave to leave rooms on server as on client side it will overwhelm the client */
      io.getIO().in(`${streamId}-public`).socketsLeave(`${streamId}-public`)

      return res.status(200).json({
        actionStatus: "success",
        message:
          "stream ended successfully, If you have pending call, then please call the customer fast 👍👍🤘",
      })
    })
    .catch((err) => {
      next(err)
    })
    .finally(() => {
      /* to execute absolute necessary code */
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
  const callSetupBufferSeconds = 8 /* time after which the call will officially start */
  const callStartTimeStamp = Date.now() + callSetupBufferSeconds * 1000
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
  ])
    .then(([call, modelWallet, viewerWallet]) => {
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
           */
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
      return Promise.all([modelWallet.save(), viewerWallet.save()])
    })
    .then(([modelWallet, viewerWallet]) => {
      /* update the local wallet of model */
      io.getIO()
        .in(`${req.user.relatedUser._id}-private`)
        .emit("model-wallet-updated", {
          modelId: req.user.relatedUser._id,
          operation: "set",
          amount: modelWallet.currentAmount,
        })

      /* add the call as pending call for both model and viewer */
      return Promise.all([
        Viewer.findOneAndUpdate(
          { _id: callDoc.viewer },
          {
            $push:
              callDoc.callType === "AudioCall"
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
              callDoc.callType === "AudioCall"
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
        clientSocket.callType = callDoc.callType
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
          ? callDoc.minCallDuration + callSetupBufferSeconds
          : modelTokenValidity +
              60 /* anyway viewer token expiry is just for preventing extra "agora connection time", adding 60 so that model and viewers token expirey dont fire at the same time */,
        canAffordNextMinute ? "min" : "sec"
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
          ? callDoc.minCallDuration + callSetupBufferSeconds
          : modelTokenValidity + callSetupBufferSeconds,
        canAffordNextMinute ? "min" : "sec"
      )

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
    .catch((err) => {
      if (typeof err !== "string") {
        return next(err)
      }
    })
}

exports.handleEndCallFromViewer = (req, res, next) => {
  const { callId, callType, endTimeStamp } = req.body
  let { socketId } = req.query

  let theCall
  let viewerWallet
  /* 
     amount to deduct from the models wallet 
     NOTE: this can be zero (0) if the call disconnects before the min call duration
     as we have already deducted the min call duration amount from the viewer
  */
  let amountToDeduct
  let amountAdded /* amount added in the models wallet */
  let modelWallet

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
      if (!socketId) {
        socketId = Array.from(
          io
            .getIO()
            .sockets.adapter.rooms.get(`${req.user.relatedUser._id}-private`)
        )?.[0]
      }

      if (result.nModified === 0) {
        /* no doc modified, model has ended tha call faster, return */
        res.status(200).json({
          actionStatus: "failed",
          wasFirst: "no" /* was first to put the call end request */,
          message:
            "model ended call before you, please wait while we are processing the transaction!",
        })
        return Promise.reject("Model ended before")
      } else if (result.nModified > 0) {
        /* you have locked the db model cannot over-rite */
        const query =
          callType === "audioCall"
            ? Promise.all([
                AudioCall.findById(callId),
                Wallet.findOne({ relatedUser: req.user.relatedUser._id }),
              ])
            : Promise.all([
                VideoCall.findById(callId),
                Wallet.findOne({ relatedUser: req.user.relatedUser._id }),
              ])
        return query
      }
    })
    .then((values) => {
      theCall = values[0]
      viewerWallet = values[1]

      /* decrease model count */
      io.getIO().emit(
        chatEvents.call_end,
        io.decreaseLiveCount(theCall.model.toString())
      )

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
        theCall.endReason = "viewer-ended"
        theCall.status = "ended"
        theCall.callDuration = (+endTimeStamp - theCall.startTimeStamp) / 1000
        const totalCallDuration =
          (+endTimeStamp - theCall.startTimeStamp) /
          60000 /* convert milliseconds to minutes */

        if (totalCallDuration <= theCall.minCallDuration) {
          amountToDeduct = 0
        } else {
          const billableCallDuration = Math.ceil(
            totalCallDuration - theCall.minCallDuration
          ) /* in minutes */
          amountToDeduct = billableCallDuration * theCall.chargePerMin
        }
        viewerWallet.deductAmount(amountToDeduct, 1)

        return Promise.all([
          viewerWallet.save(),
          theCall.save(),
          Model.findByIdAndUpdate(theCall.model._id, {
            onCall: false,
            isStreaming: false,
          })
            .select("sharePercent")
            .lean(),
          Wallet.findOne({ relatedUser: theCall.model._id }),
        ])
      }
    })
    .then((values) => {
      const sharePercent = values[2].sharePercent
      modelWallet = values[3]
      /* assign the latest values to theCall */
      theCall = values[1]
      amountAdded = amountToDeduct * (sharePercent / 100)
      modelWallet.addAmount(amountAdded)
      /* for admin account */
      // adminWallet.addAmount(amountToDeduct * ((100 - sharePercent) / 100))
      return modelWallet.save()
    })
    .then((wallet) => {
      /* now remove the pending calls from model & viewer */
      const viewerPr = Viewer.updateOne(
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
      )

      const modelPr = Model.updateOne(
        {
          _id: theCall.model._id,
        },
        {
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
      )
      return Promise.all([viewerPr, modelPr])
    })
    .then((values) => {
      if (values[1].n + values[0].n === 2) {
        /* update models local wallet  */
        io.getIO()
          .in(`${theCall.model._id.toString()}-private`)
          .emit("model-wallet-updated", {
            modelId: theCall.model._id,
            operation: "add",
            amount: amountAdded,
          })

        /* not have to show call end details of the model, model already have viewers detail */
        io.getIO()
          .in(`${theCall.stream._id.toString()}-public`)
          .emit(chatEvents.viewer_call_end_request_finished, {
            theCall: theCall._doc,
            modelGot: amountAdded,
            totalCharges: amountToDeduct,
            message: "Call was ended successfully by the model",
            ended: "ok",
          })

        return res.status(200).json({
          theCall: theCall,
          currentAmount: viewerWallet.currentAmount,
          totalCharges: amountToDeduct,
          actionStatus: "success",
          message: "call was ended successfully",
          wasFirst: "yes" /* was first to put the call end request */,
        })
      } else {
        const error = new Error("pending calls were not removed successfully")
        error.statusCode = 500
        throw error
      }
    })
    .catch((err) => {
      if (typeof err !== "string") {
        return next(err)
      }
    })

  /**
   * 1. remove this call from pending calls of viewer & model
   * 2. bill & debit the amount respectively
   * 3. write meta data to the call record and close
   * 4. change model status
   * 5. destroy chat channels
   */
}

exports.handleEndCallFromModel = (req, res, next) => {
  const { callId, callType, endTimeStamp } = req.body
  let { socketId } = req.query

  let theCall
  let modelWallet

  /* amount to deduct from the models wallet 
     NOTE: this can be zero (0) if the call disconnects before the min call duration
     as we have already deducted the min call duration amount from the viewer
  */

  let amountToDeduct
  let amountAdded /* amount added in the models wallet */

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
      if (!socketId) {
        socketId = Array.from(
          io
            .getIO()
            .sockets.adapter.rooms.get(`${req.user.relatedUser._id}-private`)
        )?.[0]
      }
      if (result.nModified === 0) {
        /* no doc modified, viewer has ended tha call faster, return */
        res.status(200).json({
          actionStatus: "failed",
          wasFirst: "no" /* was first to put the call end request */,
          message:
            "viewer ended call before you, please wait while we are processing the transaction!",
        })
        return Promise.reject("Viewer ended before")
      } else if (result.nModified > 0) {
        /* emit this event for updating live count on the client side */
        io.getIO().emit(
          chatEvents.call_end,
          io.decreaseLiveCount(req.user.relatedUser._id.toString())
        )
        /* you have locked the db model cannot over-rite */
        const query =
          callType === "audioCall"
            ? Promise.all([
                AudioCall.findById(callId),
                Wallet.findOne({ relatedUser: req.user.relatedUser._id }),
              ])
            : Promise.all([
                VideoCall.findById(callId),
                Wallet.findOne({ relatedUser: req.user.relatedUser._id }),
              ])
        return query
      }
    })
    .then((values) => {
      theCall = values[0]
      modelWallet = values[1]

      if (theCall.status !== "ongoing") {
        /* 🚩🚩🚩🚩🚩====ERROR====🚩🚩🚩🚩🚩🚩 */
        /* means the call was not setup properly*/
        /* now refund the money of the user */
        theCall.status = "ended"
        theCall.endReason = "viewer-network-error"
        const amountToRefund = theCall.minCallDuration * theCall.chargePerMin
        const amtToDeductFromModel =
          amountToRefund * (theCall.sharePercent / 100)
        console.error(
          "A call was not setup properly, hence refunding amt: ",
          amountToRefund
        )
        Promise.all([
          theCall.save(),
          Wallet.updateOne(
            {
              relatedUser: theCall.viewer._id,
            },
            {
              $inc: { currentAmount: amountToRefund },
            }
          ),
          Wallet.updateOne(
            {
              relatedUser: theCall.model._id,
            },
            {
              $inc: { currentAmount: -amtToDeductFromModel },
            }
          ),
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
            }
          ),
        ])
          .then((result) => {
            /* UPDATE MODELS LOCAL WALLET */
            io.getIO()
              .in(`${theCall.model._id}-private`)
              .emit("model-wallet-updated", {
                modelId: theCall.model._id,
                operation: "dec",
                amount: amtToDeductFromModel,
              })

            io.getIO()
              .in(`${theCall.viewer._id}-private`)
              .emit(chatEvents.model_call_end_request_finished, {
                theCall: theCall._doc,
                amountToRefund: amountToRefund,
                message:
                  "Call was not connected properly hence your money is refunded",
                ended: "not-setuped-properly",
              })

            if (result[1].n + result[2].n + result[3].n + result[4].n !== 4) {
              console.error("All documents were not updated, while ending call")
            }

            return res.status(200).json({
              actionStatus: "success",
              wasFirst: "yes",
              callWasNotSetupProperly: true,
            })
          })
          .catch((err) => next(err))
        /* break out of the below promise chain */
        return Promise.reject("The call was not ongoing")

        /* ==== CALL NOT ONGOING BLOCK 👆👆 ==== */
      }

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
        theCall.callDuration = (+endTimeStamp - theCall.startTimeStamp) / 1000
        theCall.endReason = "model-ended"
        theCall.status = "ended"
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
        amountAdded = amountToDeduct * (req.user.relatedUser.sharePercent / 100)
        modelWallet.addAmount(amountAdded)
        /* for admin account */
        // adminWallet.addAmount(amountToDeduct * ((100 - sharePercent) / 100))
        return Promise.all([
          modelWallet.save(),
          theCall.save(),
          Wallet.findOne({ relatedUser: theCall.viewer._id }),
          Model.updateOne(
            { _id: req.user.relatedUser._id },
            {
              onCall: false,
              isStreaming: false,
            }
          ),
        ])
      }
    })
    .then((values) => {
      /* assign the latest values to theCall */
      theCall = values[1]
      viewerWallet = values[2]
      viewerWallet.deductAmount(amountToDeduct, 1)
      return viewerWallet.save()
    })
    .then(() => {
      /* now remove the pending calls from model & viewer */
      const viewerPr = Viewer.updateOne(
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
      )

      const modelPr = Model.updateOne(
        {
          _id: theCall.model._id,
        },
        {
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
      )
      return Promise.all([viewerPr, modelPr])
    })
    .then((values) => {
      if (values[1].n + values[0].n === 2) {
        /* update models local wallet */
        io.getIO()
          .in(`${theCall.model._id.toString()}-private`)
          .emit("model-wallet-updated", {
            modelId: theCall.model._id,
            operation: "add",
            amount: amountAdded,
          })

        /* this  will help the viewer to get the call end details */
        io.getIO()
          .in(`${theCall.stream._id.toString()}-public`)
          .emit(chatEvents.model_call_end_request_finished, {
            theCall: theCall._doc,
            modelGot: amountAdded,
            totalCharges: amountToDeduct,
            message: "Call was ended successfully by the model",
            ended: "ok",
          })

        /* emit the same event, directly to the viewer in case the first one has not reached the viewer */
        setTimeout(() => {
          io.getIO()
            .in(`${theCall.viewer._id.toString()}-public`)
            .emit(chatEvents.model_call_end_request_finished, {
              theCall: theCall._doc,
              modelGot: amountAdded,
              totalCharges: amountToDeduct,
              message: "Call was ended successfully by the model",
              ended: "ok",
            })
        }, [1000])

        return res.status(200).json({
          theCall: theCall,
          currentAmount: modelWallet.currentAmount,
          modelGot: amountAdded,
          totalCharges: amountToDeduct,
          actionStatus: "success",
          message: "call was ended successfully",
          wasFirst: "yes" /* was first to put the call end request */,
        })
      } else {
        /* should not through err as it means the call was not setup correctly, hence roll back everything */
        const error = new Error("pending calls were not removed successfully")
        error.statusCode = 500
        throw error
      }
    })
    .catch((err) => {
      if (typeof err !== "string") {
        return next(err)
      }
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
        clientSocket.callType = callDoc.callType
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

  const { modelId, tokenAmount, socketData } = req.body

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
          .select("name profileImage"),
      ])
    })
    .then(([_r, viewer]) => {
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
        io.getIO()
          .in(socketData.room)
          .emit(chatEvents.viewer_super_message_public_received, socketData)
        return res.status(200).json({
          actionStatus: "success",
          viewerNewWalletAmount: viewerNewWalletAmount,
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
  ])
    .then(([wallet, model]) => {
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
            by: req.user.relatedUser,
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
      } else {
        const error = new Error(
          `You dont have sufficient amount of coins to gift the model, ${activity.price} coins are required you have only ${wallet.currentAmount} coins`
        )
        error.statusCode = 400
        throw error
      }
    })
    .then((result) => {
      io.getIO()
        .in(`${modelId}-private`)
        .emit("model-wallet-updated", {
          modelId: modelId,
          operation: "add",
          amount: activity.price * (sharePercent / 100),
        })

      io.getIO()
        .in(room)
        .emit(chatEvents.viewer_super_message_public_received, socketData)

      return res.status(200).json({
        actionStatus: "success",
        viewerNewWalletAmount: viewerNewWalletAmount,
      })
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
    socketId = Array.from(
      io
        .getIO()
        .sockets.adapter.rooms.get(`${req.user.relatedUser._id}-private`)
    )[0]
  }

  try {
    const model = await Model.findById(modelId)
      .select("currentStream isStreaming")
      .lean()

    /* ========================== */
    /**
     * all the viewers will rejoin on the same will over whelm the system
     * so dont't emit during rejoin only emit to the model
     */
    if (model.isStreaming) {
      /* if model is streaming */
      /* if rejoin it means model already have your data */
      io.getIO()
        .in(`${modelId}-private`)
        .emit(`${socketEvents.viewerJoined}-private`, {
          // roomSize: roomSize, /* hey model ask the room size with a http request after a time gap  */
          reJoin: true /* hey, model if rejoin then don't update live count*/,
          relatedUserId: req.user.relatedUser._id,
        })

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

      if (getNewToken) {
        const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
          "viewer",
          req.user.relatedUser._id,
          modelId
        )
        return res.status(200).json({
          actionStatus: "success",
          isChatPlanActive: req.user.relatedUser.isChatPlanActive,
          streamId: model.currentStream._id,
          socketUpdated: socketUpdated,
          privilegeExpiredTs: privilegeExpiredTs,
          rtcToken: rtcToken,
        })
      }
      return res.status(200).json({
        actionStatus: "success",
        isChatPlanActive: req.user.relatedUser.isChatPlanActive,
        streamId: model.currentStream._id,
        socketUpdated: socketUpdated,
      })
    }
    return res.status(200).json({
      actionStatus: "failed",
      message: "This model is currently no streaming, please comeback later.",
      isChatPlanActive: req.user.relatedUser.isChatPlanActive,
    })
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
        }
        return res.status(200).json({
          actionStatus: "success",
          streamId: model.currentStream._id,
          socketUpdated: socketUpdated,
        })
      }
      return res.status(400).json({
        actionStatus: "failed",
        message:
          "This model is currently not streaming, please comeback later.",
      })
    })
    .catch((err) => next(err))
}

exports.getLiveRoomCount = (req, res, next) => {
  /**
   * return the live viewer count in a socket room
   */
  const { room } = req.params

  return res.status(200).json({
    roomSize: io.getIO().sockets.adapter.rooms.get(room)?.size,
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
