const AudioCall = require("../../models/globals/audioCall")
const Stream = require("../../models/globals/Stream")
const TokenGiftHistory = require("../../models/globals/tokenGiftHistory")
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
const realtimeDb = getDatabase()

/* 
    👉👉 function to handle streaming start is in tokenBuilderController
*/

exports.withOutTokenStreamStart = (req, res, next) => {
  // create stream and generate token for model
  // this end point will be called by the model

  /* 🤔🤔🧲 any qouta for how many times a model can stream in a day */

  const { socketId } = req.query

  // check if the model is approved or not,
  // by making a new model approval checker

  /* 🔺🔺 commented for presentation only 🔻🔻 */
  /* if (req.user.relatedUser.isStreaming || req.user.relatedUser.onCall) {
    return res.status(400).json({
      actionStatus: "failed",
      message:
        "You are streaming or taking call, already from another account, streaming from two devices is not currently supported!",
    })
  } */

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
        .select("profileImage")
        .lean()
    })
    .then((model) => {
      // io.join(theStream._id)
      // everybody will get the notification of new stream
      /* 👉👉 return data so as to compose the complete card on the main page */

      const streamRoomPublic = `${theStream._id}-public`
      let clientSocket = io.getIO().sockets.sockets.get(socketId)
      /* save data on client about the stream */
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
      clientSocket.isStreaming = true
      clientSocket.streamId = theStream._id.toString()
      clientSocket.join(streamRoomPublic)

      /* 👇👇 broadcast to all who are not in any room */
      // io.getIO().except(io.getIO().sockets.adapter.rooms)

      clientSocket.broadcast.emit(socketEvents.streamCreated, {
        modelId: req.user.relatedUser._id,
        profileImage: model.profileImage,
      })
      res.status(200).json({
        actionStatus: "success",
        streamId: theStream._id,
      })
    })
    .catch((err) => {
      Stream.deleteOne({ _id: theStream._id })
        .then((_) => next(err))
        .catch((_error) => next(err))
    })
}

exports.handleEndStream = (req, res, next) => {
  // this will be called by the model only

  let { streamId, reason, callId, callType } = req.body
  const { socketId } = req.query
  if (!reason) {
    reason = "Error"
  }

  // will send socket event to trigger leave agora channel on client
  // anyway they have to renew token hence no misuse for longer period
  let callPr
  if (callType === "audioCall") {
    callPr = AudioCall.findById(callId)
  } else {
    callPr = VideoCall.findById(callId)
  }

  if (callId && callType) {
    Promise.all([callPr])
      .then((call) => {
        if (call.stream._id.toString() === streamId) {
          return Stream.findById(streamId)
        }
        const error = new Error(
          "call is not for this stream or this stream does not have nay call request"
        )
        error.statusCode = 422
        throw error
      })
      .then((stream) => {
        const duration =
          (new Date(stream.createdAt).getTime() - new Date().getTime()) / 600000
        stream.endReason = reason
        stream.status = "ended"
        stream.duration = duration
        if (callType === "audioCall") {
          stream.endAudioCall = call
        } else {
          stream.endVideoCall = call
        }
        return save()
      })
      .then((stream) => {
        // using .in so that everybody leaves the stream
        io.getIO().in(streamId).emit(socketEvents.deleteStreamRoom, {
          streamId,
          viewerId: call.viewer._id,
        })
        res.status(200).json({
          actionStatus: "success",
          message:
            "stream ended successfully, If you have pending call, then please call the customer fast 👍👍🤘",
        })
      })
      .catch((err) => next(err))
  } else {
    /* if model canceled stream with booking any calls */
    Stream.findById(streamId)
      .then((stream) => {
        const duration =
          (new Date().getTime() - new Date(stream.createdAt).getTime()) /
          60000 /* in minutes */
        stream.endReason = reason
        stream.status = "ended"
        stream.duration = duration
        return Promise.all([
          stream.save(),
          Model.updateOne(
            { _id: req.user.relatedUser._id },
            {
              isStreaming: false,
              currentStream: null,
            }
          ),
        ])
      })
      .then((values) => {
        const stream = values[0]
        const model = values[1]
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
        if (!clientSocket) {
          io.getIO()
            .in(`${streamId}-public`)
            .emit(socketEvents.deleteStreamRoom, {
              modelId: req.user.relatedUser._id,
            })
        } else {
          clientSocket.broadcast.emit(socketEvents.deleteStreamRoom, {
            modelId: req.user.relatedUser._id,
          })
        }

        /* destroy the stream chat rooms */
        io.getIO()
          .in(`${stream._id}-public`)
          .socketsLeave(`${stream._id}-public`)

        // 👇👇 why leave this, this is model id private room
        // io.getIO()
        //   .in(`${req.user.relatedUser._id}-private`)
        //   .except(socketId)
        //   .socketsLeave(`${req.user.relatedUser._id}-private`)

        /* remove previous streams attributes from socket client */
        clientSocket.isStreaming = false
        clientSocket.streamId = null

        res.status(200).json({
          actionStatus: "success",
          message:
            "stream ended successfully, If you have pending call, then please call the customer fast 👍👍🤘",
        })
      })
      .catch((err) => next(err))
  }
}

exports.handleViewerCallRequest = (req, res, next) => {
  // viewer must be authenticated
  // must have money >= min required

  const { modelId, streamId, callType, walletCoins, relatedUserId } = req.body

  /* this data will be sent to the viewers */

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
  ])
    .then((values) => {
      const wallet = values[0]
      const model = values[1]
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
              viewer: req.user,
            })

          return res.status(201).json({
            actionStatus: "success",
            message: `Request for ${callType} has been sent to the model, you will be notified when model accepts the call`,
          })
        } else {
          /* if not streaming */
          const error = new Error("The model is not currently streaming!")
          error.statusCode = 401
          throw error
        }
      } else {
        /* in sufficient balance */
        const error = new Error(
          `You do not have sufficient balance in your wallet to request ${callType}, ₹ ${minBalance} is required, you have ₹ ${wallet.currentAmount}`
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
    return res.status(400).json({
      actionStatus: "success",
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
    )[0]
  }

  /* 
    socketData schema => {
      response: response 
      callType: callType,
      relatedUserId: relatedUserId
    }
  */

  const viewerId = req.body.socketData.relatedUserId
  const callType = req.body.socketData.callType

  let theCall = callType === "audioCall" ? AudioCall : VideoCall
  let callDoc
  const callStartTimeStamp = Date.now() + 0
  socketData.callStartTs = callStartTimeStamp

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
      socketData.callId = callDoc._id.toString()
      const minCharges = callDoc.chargePerMin * callDoc.minCallDuration
      try {
        viewerWallet.deductAmount(minCharges)
      } catch (error) {
        next(error)
      }
      modelWallet.addAmount(
        minCharges * (req.user.relatedUser.sharePercent / 100)
      )
      // rest add to the admin wallet
      // TODO: transfer coins to admin also 🔺🔻
      return Promise.all([modelWallet.save(), viewerWallet.save()])
    })
    .then(([modelWallet, viewerWallet]) => {
      /* add the call as pending call for both model and viewer */
      io.getIO()
        .in(`${req.user.relatedUser._id}-private`)
        .emit("model-wallet-updated", {
          modelId: req.user.relatedUser._id,
          operation: "set",
          amount: modelWallet.currentAmount,
        })
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
      /*  */
      const viewer = result[0]
      if (result[1].n !== 1) {
        const newError = new Error("Model status not updated in DB")
        newError.statusCode = 400
        throw newError
      }

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
      delete clientSocket.isStreaming
      delete clientSocket.streamId

      clientSocket.onCall = true
      clientSocket.callId = callDoc._id.toString()
      clientSocket.callType = callDoc.callType
      clientSocket.sharePercent = +req.user.relatedUser.sharePercent

      io.getIO()
        .in(`${streamId}-public`)
        .emit(chatEvents.model_call_request_response_received, socketData)

      /* MAKE ALL OTHER CLIENTS EXCEPT THE MOdEL AND THE VIEWER LEAVE PUBLIC CHANNEL & destroy private channel 
        but leaving will be done from client side, later can kick user out from server 🔺🔺
      */
      /* not destorying public channel for token gift to work on call */

      return res.status(200).json({
        actionStatus: "success",
        viewerDoc: viewer,
        callDoc: callDoc,
        callStartTs: callStartTimeStamp /* not ISO, its in milliseconds */,
      })
    })
    .catch((err) => next(err))
}

exports.handleEndCallFromViewer = (req, res, next) => {
  const { callId, callType, endTimeStamp } = req.body
  let { socketId } = req.query

  if (!socketId) {
    socketId = Array.from(
      io
        .getIO()
        .sockets.adapter.rooms.get(`${req.user.relatedUser._id}-private`)
    )[0]
  }

  let theCall
  let viewerWallet
  /* amount to deduct from the models wallet 
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
      if (result.n === 0) {
        /* no doc modified, model has ended tha call faster, return */
        res.status(200).json({
          actionStatus: "failed",
          wasFirst: "no" /* was first to put the call end request */,
          message:
            "model ended call before you, please wait while we are processing the transaction!",
        })
      } else if (result.n > 0) {
        /* you have locked the db model cannot over-rite */
        const query =
          callType === "audioCall"
            ? Promise.all([
                AudioCall.findById(callId)
                  .populate({
                    path: "model",
                    select: "name username profileImage",
                  })
                  .populate({
                    path: "viewer",
                    select: "name wallet",
                    populate: {
                      path: "wallet",
                      select: "currentAmount",
                    },
                  }),
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
          60000 /* convert milliseconds to minutes */

        if (totalCallDuration <= theCall.minCallDuration) {
          amountToDeduct = 0
        } else {
          const billableCallDuration = Math.ceil(
            totalCallDuration - theCall.minCallDuration
          ) /* in minutes */
          amountToDeduct = billableCallDuration * theCall.chargePerMin
        }
        viewerWallet.deductAmount(amountToDeduct)
        return Promise.all([
          viewerWallet.save(),
          theCall.save(),
          Model.findById(theCall.model._id).select("sharePercent").lean(),
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
          _id: req.user.relatedUser._id,
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

      const modelPr = Model.findOneAndUpdate(
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
        .select("name profileImage")
        .lean()
      return Promise.all([viewerPr, modelPr])
    })
    .then((values) => {
      if (values[0].n === 1) {
        /* have to show the model, model already have viewers detail */

        io.getIO()
          .in(`${theCall.stream._id.toString()}-public`)
          .emit(chatEvents.viewer_call_end_request_finished, {
            theCall: theCall._doc,
            modelGot: amountAdded,
            totalCharges: amountToDeduct,
            message: "Call was ended successfully by the model",
            ended: "ok",
          })

        /* clear the viewer's socket */
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
        clientSocket.onCall = false
        clientSocket.callId = null
        clientSocket.callType = null

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
    .catch((err) => next(err))

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
  if (!socketId) {
    socketId = Array.from(
      io
        .getIO()
        .sockets.adapter.rooms.get(`${req.user.relatedUser._id}-private`)
    )[0]
  }

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
        amountAdded = amountToDeduct * (req.user.relatedUser.sharePercent / 100)
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

      const modelPr = Model.findOneAndUpdate(
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
      if (values[1].n === 1) {
        /*this  will help the viewer to get the call end details */
        io.getIO()
          .in(`${theCall.stream._id.toString()}-public`)
          .emit(chatEvents.model_call_end_request_finished, {
            theCall: theCall._doc,
            modelGot: amountAdded,
            totalCharges: amountToDeduct,
            message: "Call was ended successfully by the model",
            ended: "ok",
          })

        /* clear model's socket client */
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
        clientSocket.onCall = false
        clientSocket.callId = null
        clientSocket.callType = null

        res.status(200).json({
          theCall: theCall,
          currentAmount: modelWallet.currentAmount,
          modelGot: amountAdded,
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
    .catch((err) => next(err))

  /**
   * 1. remove this call from pending calls of viewer & model
   * 2. bill & debit the amount respectively
   * 3. write meta data to the call record and close
   * 4. change model status
   * 5. destroy chat channels
   */
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
  let alreadyFollowing = false

  if (req.user.userType !== "Model") {
    return res.status(200).json({
      actionStatus: "failed",
      message: "Only viewers can follow the models!",
    })
  }

  Viewer.updateOne(
    {
      _id: req.relatedUser._id,
    },
    {
      $addToSet: { following: modelId },
    }
  )
    .then((result) => {
      if (result.n > 0) {
        /* was not already following */
        /* add following */
        return Promise.all([
          Model.updateOne(
            {
              _id: modelId,
            },
            {
              $addToSet: { following: req.user.relatedUser._id },
              $inc: { numberOfFollowers: 1 },
            }
          ),
        ])
      } else {
        /* was already in array */
        /* unfollow model */
        alreadyFollowing = true
        return Promise.all([
          Model.updateOne(
            {
              _id: modelId,
            },
            {
              $pull: { following: req.user.relatedUser._id },
              $inc: { numberOfFollowers: -1 },
            }
          ),
          Viewer.updateOne(
            {
              _id: req.relatedUser._id,
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
        res.status(200).json({
          actionStatus: "success",
          message: "You are not following this model from now.",
          action: "un-follow",
        })
      } else {
        res.status(200).json({
          actionStatus: "success",
          message: "You are now following this model.",
          action: "follow",
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
  if (req.user.userType !== "Model") {
    return res.status(200).json({
      actionStatus: "failed",
      message: "Only viewers can un-follow the models!",
    })
  }
}

exports.processTokenGift = (req, res, next) => {
  /* handle the gifting of token by the user to model */

  const { modelId, tokenAmount, socketData } = req.body
  const { socketId } = req.query

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
      streamId = model.currentStream._id.toString()
      if (!sharePercent) {
        sharePercent = 60
      }
      return Wallet.updateOne(
        { relatedUser: modelId },
        {
          $inc: { currentAmount: tokenAmount * (sharePercent / 100) },
        }
      )
    })
    .then(() => {
      io.getIO()
        .in(`${modelId}-private`)
        .emit("model-wallet-updated", {
          modelId: modelId,
          operation: "add",
          amount: tokenAmount * (sharePercent / 100),
        })
      return TokenGiftHistory({
        tokenAmount: tokenAmount,
        forModel: modelId,
        by: req.user.relatedUser,
      }).save()
    })
    .then(() => {
      /* save data in firebase */
      const path = `publicChats/${streamId}`
      return realtimeDb.ref(path).child("chats").push(socketData)
    })
    .then(() => {
      // const clientSocket = io.getIO().sockets.sockets.get(socketId)
      io.getIO()
        .in(socketData.room)
        .emit(chatEvents.viewer_super_message_public_received, socketData)
      res.status(200).json({
        actionStatus: "success",
        viewerNewWalletAmount: viewerNewWalletAmount,
      })
    })
    .catch((error) => next(error))
}

exports.processTipMenuRequest = (req, res, next) => {
  controllerErrorCollector(req)
  const { activity, modelId, socketData, room } = req.body

  let sharePercent
  let viewerNewWalletAmount
  let streamId
  Wallet.findOne({ rootUser: req.user._id })
    .then((wallet) => {
      if (activity.price <= wallet.currentAmount) {
        const amountLeft = wallet.currentAmount - activity.price
        viewerNewWalletAmount = amountLeft
        wallet.currentAmount = amountLeft
        return wallet.save()
      } else {
        const error = new Error(
          `You dont have sufficient amount of coins to gift the model, ${activity.price} is required you have only ${wallet.currentAmount}`
        )
        error.statusCode = 400
        throw error
      }
    })
    .then((wallet) => {
      /* transfer the amount to model*/
      return Model.findById(modelId).select("sharePercent currentStream").lean()
    })
    .then((model) => {
      sharePercent = model?.sharePercent
      streamId = model.currentStream._id
      if (!sharePercent) {
        sharePercent = 60
      }
      return Wallet.updateOne(
        { relatedUser: modelId },
        {
          $inc: { currentAmount: activity.price * (sharePercent / 100) },
        }
      )
    })
    .then(() => {
      io.getIO()
        .in(`${modelId}-private`)
        .emit("model-wallet-updated", {
          modelId: modelId,
          operation: "add",
          amount: activity.price * (sharePercent / 100),
        })
      return TokenGiftHistory({
        tokenAmount: activity.price,
        forModel: modelId,
        by: req.user.relatedUser,
      }).save()
    })
    .then(() => {
      /* save data in firebase */
      const path = `publicChats/${streamId}`
      return realtimeDb.ref(path).child("chats").push(socketData)
    })
    .then(() => {
      // const clientSocket = io.getIO().sockets.sockets.get(socketId)
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
      if (viewer.isChatPlanActive) {
      }
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
      res.status(200).json({
        actionStatus: "success",
        details: model,
      })
    })
}

exports.reJoinModelsCurrentStreamAuthed = async (req, res, next) => {
  /* join models current stream even when he quits and restarts */
  /* NOTE: at this sage the viewer already has the rtcToken */

  const { modelId } = req.body
  let { socketId } = req.query

  if (!socketId) {
    socketId = Array.from(
      io
        .getIO()
        .sockets.adapter.rooms.get(`${req.user.relatedUser._id}-private`)
    )[0]
  }

  try {
    const [viewer, model] = await Promise.all([
      Viewer.findById(req.user.relatedUser._id)
        .select("isChatPlanActive")
        .lean(),
      Model.findById(modelId).select("currentStream isStreaming").lean(),
    ])

    if (model.isStreaming) {
      io.getIO()
        .sockets.sockets.get(socketId)
        .join(`${model.currentStream._id}-public`)
      if (viewer.isChatPlanActive) {
        if (
          /* 👇👇 for use in production */
          // new Date(viewer.currentChatPlan.willExpireOn).getTime() >
          // Date.now() + 10000
          /* for now always true */
          true
        ) {
          /* for future  */
        }
        /* join his own channel */
        io.getIO()
          .sockets.sockets.get(socketId)
          .join(`${req.user.relatedUser._id}-private`)
      }

      return res.status(200).json({
        actionStatus: "success",
        isChatPlanActive: req.user.relatedUser.isChatPlanActive,
        streamId: model.currentStream._id,
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
  const { modelId } = req.body
  const { socketId } = req.query

  Model.findById(modelId)
    .select("currentStream isStreaming")
    .lean()
    .then((model) => {
      if (!model) {
        const err = new Error("Invalid model id, model does not exists!")
        err.statusCode = 400
        throw err
      }
      if (model?.isStreaming) {
        io.getIO()
          .sockets.sockets.get(socketId)
          .join(`${model.currentStream._id}-public`)
        return res.status(200).json({
          actionStatus: "success",
          streamId: model.currentStream._id,
        })
      }
      return res.status(400).json({
        actionStatus: "failed",
        message: "This model is currently no streaming, please comeback later.",
      })
    })
    .catch((err) => next(err))
}
