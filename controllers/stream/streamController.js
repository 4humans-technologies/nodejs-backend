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

  let theStream
  Stream({
    model: req.user.relatedUser._id,
    createdAt: new Date().toISOString(),
  })
    .save()
    .then((stream) => {
      theStream = stream
      return Model.findOneAndUpdate(
        { _id: req.user.relatedUser._id },
        {
          isStreaming: true,
          currentStream: stream._id,
          /* 👇👇 how to ensure same stream is not added again */
          $push: { streams: stream },
        },
      )
        .select("profileImage")
        .lean()
    })
    .then((model) => {
      // io.join(theStream._id)
      // everybody will get the notification of new stream
      /* 👉👉 return data so as to compose the complete card on the main page */

      const streamRoomPublic = `${theStream._id}-public`
      const streamRoomPrivate = `${theStream._id}-private`
      const clientSocket = io.getIO().sockets.sockets.get(socketId)
      clientSocket.join(streamRoomPublic)
      clientSocket.join(streamRoomPrivate)

      /* 👇👇 broadcast to all who are not in any room */
      // io.getIO().except(io.getIO().sockets.adapter.rooms)

      clientSocket.broadcast.emit(socketEvents.streamCreated, { modelId: req.user.relatedUser._id, profileImage: model.profileImage })
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
        io.in(streamId).emit(socketEvents.deleteStreamRoom, {
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
    // model bored and cut the livestream by himself
    Stream.findById(streamId)
      .then((stream) => {
        const duration =
          (-new Date(stream.createdAt).getTime() + new Date().getTime()) / 1000
        stream.endReason = reason
        stream.status = "ended"
        stream.duration = duration
        return stream.save()

      })
      .then((stream) => {
        // using .in so that everybody leaves the stream
        // and disconnect() manually hence leaving all the channels
        // and then reconnects
        const clientSocket = io.getIO().sockets.sockets.get(socketId)
        clientSocket.broadcast.emit(socketEvents.deleteStreamRoom, {
          modelId: req.user.relatedUser._id
        })
        Model.findOneAndUpdate(
          { _id: req.user.relatedUser._id },
          {
            isStreaming: false
          })
          .select("name")
          .lean()
          .then(model => {
            res.status(200).json({
              actionStatus: "success",
              message: "stream ended successfully, If you have pending call, then please call the customer fast 👍👍🤘",
            })
          })
      })
      .catch((err) => next(err))
  }
}

exports.handleViewerCallRequest = (req, res, next) => {
  // viewer must be authenticated
  // must have money >= min required

  const viewerId = req.user.relatedUser._id
  const { modelId, streamId, callType } = req.body
  let theCall = callType === "audioCall" ? AudioCall : VideoCall

  Stream.findById(streamId)
    .then((stream) => {
      if (
        stream.model._id.toString() === modelId &&
        stream.status !== "ended"
      ) {
        return Promise.all([
          Model.findById(modelId),
          Wallet.findOne({ _id: req.user.relatedUser.wallet._id }),
        ])
      }
      const error = new Error(
        "The stream has ended or the model does not belong to this stream or vice versa"
      )
      error.statusCode = 401
      throw error
    })
    .then(({ model, viewerWallet }) => {
      const minBalance = model.charges.audioCall * model.charges.videoCall
      if (viewerWallet.currentAmount >= minBalance) {
        return theCall({
          model: model._id,
          viewer: req.user.relatedUser._id,
          stream: streamId,
          status: "model-accept-pending",
          chargePerMin:
            callType === "audioCall"
              ? model.charges.audioCall
              : model.charges.videoCall,
          minCallDuration: model.minCallDuration,
        })
      }
      const error = new Error(
        `You do not have sufficient balance in your wallet to request ${callType}, ₹ ${minBalance} is required`
      )
      error.statusCode = 401
      throw error
    })
    .then((call) => {
      // notify every viewer in the stream about the call request
      // no need to emit different event for model, he will handle,
      // this event differently in frontend itself
      const evt =
        callType === "audioCall"
          ? socketEvents.requestedAudiCall
          : socketEvents.requestedVideoCall
      io.getIO().to(streamId).emit(evt, {
        userName: req.user.userName,
        callType,
      })
      io.getIO().join(callId)
      res.status(201).json({
        actionStatus: "success",
        message: `Request for ${callType} has been sent to the model, you will be notified when model accepts the call`,
        callId: call._id,
        callType,
      })
    })
    .catch((err) => next(err))
}

exports.handleModelAcceptedCallRequest = (req, res, next) => {
  // this end point wil be called when model accepts the call request
  // this is just for updating call doc and emitting event

  const { callId, streamId, callType, viewerUserName } = req.body
  let theCall = callType === "audioCall" ? AudioCall : VideoCall
  let callDoc
  theCall
    .findById(callId)
    .then((call) => {
      callDoc = call
      if (callDoc.model._id.toString() !== req.user.relatedUser._id) {
        if (callDoc.status !== ("ongoing" || "completed")) {
          // deduct the minimum req charges from the user
          // and transfer it to the model according to the share percentage

          const modelWalletPr = Wallet.findOne({ relatedUser: callDoc.model })
          const viewerWalletPr = Wallet.findOne({ relatedUser: callDoc.viewer })
          return Promise.all([modelWalletPr, viewerWalletPr])
        }
        const error = new Error(
          `This ${callType} is has been already completed or on going with other user`
        )
        error.statusCode = 422
        throw error
      }
      const error = new Error(
        `You are not allowed this ${callType}, this ${callType} is for another model to take`
      )
      error.statusCode = 401
      throw error
    })
    .then(([modelWallet, viewerWallet]) => {
      const minCharges = callDoc.chargePerMin * callDoc.minCallDuration
      try {
        viewerWallet.deductAmount(minCharges)
      } catch (error) {
        next(error)
      }
      modelWallet.addAmount(minCharges * (model.sharePercent / 100))
      // rest add to the admin wallet
      // TODO: transfer coins to admin also
      callDoc.status = "model-accepted-stream-ended"
      return Promise.all([
        modelWallet.save(),
        viewerWallet.save(),
        callDoc.save(),
      ])
    })
    .then(() => {
      const evt =
        callType === "audioCall"
          ? socketEvents.modelAcceptedAudioCallRequest
          : socketEvents.modelAcceptedVideoCallRequest
      // emit to everybody in stream that model accepted call
      /**
       * 🙏🙏🙏 the reciving client should save the call document details in LOCALSTOREAGE
       */
      io.getIO().to(streamId).emit(evt, { viewerUserName })
      io.to(io.getClient().id).emit(socketEvents.addedMoneyToWallet, {
        amount: minCharges * (model.sharePercent / 100),
      })
      // join call channel, viewer has already joined this channel
      io.getClient().join(callId)
      const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
        "viewer",
        req.user.relatedUser._id,
        callId,
        60
      )

      return Promise.all([
        Viewer.updateOne(
          { _id: callDoc.viewer },
          {
            pendingCall: callDoc._id,
            pendingCallType: callDoc.callType,
          }
        ),
        Model.updateOne(
          { _id: callDoc.viewer },
          {
            $push:
              callDoc.callType === "AudioCall"
                ? { "pendingCalls.$.audioCalls": callDoc._id }
                : { "pendingCalls.$.videoCalls": callDoc._id },
          }
        ),
      ]).then((values) => {
        console.debug("added pending calls >>>", values)
        res.status(200).json({
          actionStatus: "success",
          rtcToken,
          privilegeExpiredTs,
        })
      })
    })
    .catch((err) => next(err))
}

exports.handleModelDeclineCallRequest = (req, res, next) => {
  const { callId, streamId, callType, viewerUserName, declineReason } = req.body
  let theCall = callType === "audioCall" ? AudioCall : VideoCall
  theCall
    .findById(callId)
    .then((call) => {
      if (call.model._id === req.user.relatedUser._id) {
        return theCall.findByIdAndRemove(callId)
      }
      const error = new Error("you are not alloted this call | declineHandler")
      error.statusCode = 401
      throw error
    })
    .then((call) => {
      const evt = (callType = "audioCall"
        ? socketEvents.modelDeclinedAudioCallRequest
        : socketEvents.modelDeclinedVideoCallRequest)
      io.to(call.stream._id).emit(evt, {
        declineReason: declineReason && declineReason,
      })
      // remove model and viewer from the callId room
      io.socketLeave(callId)
      return res.status(200).json({
        message: "call was declined successfully by you",
        actionStatus: "success",
      })
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

  Viewer.updateOne(
    {
      _id: req.relatedUser._id,
    },
    {
      $addToSet: { following: modelId },
    }
  )
    .then((result) => {
      res.status(200).json({
        actionStatus: "success",
        message: "You are now following this model",
      })
    })
    .catch((err) => {
      if (!err?.message) {
        err.message = "Model was not followed successfully!"
      }
      next(err)
    })
}

exports.processTokenGift = (req, res, next) => {
  /* handle the gifting of token by the user to model */

  const { modelId, streamId, tokenAmount, socketData } = req.body
  const { socketId } = req.query

  let sharePercent
  let viewerNewWalletAmount
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
    .then((wallet) => {
      /* transfer the amount to model*/
      return Model.findById(modelId)
        .select("sharePercent currentStream")
        .lean()
    })
    .then((model) => {
      sharePercent = model?.sharePercent
      if (!sharePercent) {
        sharePercent = 60
      }
      return Wallet.findOneAndUpdate(
        { relatedUser: modelId },
        {
          currentAmount: tokenAmount * (sharePercent / 100),
        }
      )
        .lean()
        .exec()
    })

    .then((wallet) => {
      return TokenGiftHistory({
        tokenAmount: tokenAmount,
        forModel: modelId,
        by: req.user.relatedUser,
      }).save()
    })
    .then((history) => {
      // const clientSocket = io.getIO().sockets.sockets.get(socketId)
      io.getIO().in(socketData.room).emit(chatEvents.viewer_super_message_public_received, socketData)
      res.status(200).json({
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
      const wallet = values[0]
      const viewer = values[1]
      const plan = values[2]

      if (plan) {
        if (wallet.currentAmount >= plan.price) {
          if (!viewer.isChatPlanActive) {
            viewer.currentChatPlan = {
              planId: planId,
              willExpireOn: plan.validityDays * 24 * 3600 * 1000 + Date.now(),
              purchasedOn: new Date().toISOString(),
            }
            const newPlans = [
              ...viewer.previousChatPlans,
              {
                planId: planId,
                purchasedOn: new Date().toISOString(),
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
  const { modelId } = req.body
  Model.findById(modelId)
    .select("tipMenuActions")
    .then((model) => {
      res.status(200).json({
        actionStatus: "success",
        tips: model.tipMenuActions.actions,
      })
    })
    .catch((err) => next(err))
}

exports.getForCallDetails = (req, res, next) => {
  /* get call meta details for the model */
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
