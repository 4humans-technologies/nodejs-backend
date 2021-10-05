const AudioCall = require("../../models/globals/audioCall")
const Stream = require("../../models/globals/Stream")
const VideoCall = require("../../models/globals/videoCall")
const Wallet = require("../../models/globals/wallet")
const Model = require("../../models/userTypes/Model")
const Viewer = require("../../models/userTypes/Viewer")
const io = require("../../socket")
const socketEvents = require("../../utils/socket/socketEvents")


exports.handleEndStream = (req, res, next) => {
    // this will be called by the model only

    let { streamId, reason, callId, callType } = req.body
    if (!reason) {
        reason = "Error"
    }

    // will send socket event to trigger leave agora channel on client
    // anyway they have to renew token hence no misuse for longer period
    let callPr;
    if (callType === "audioCall") {
        callPr = AudioCall.findById(callId)
    } else {
        callPr = VideoCall.findById(callId)
    }

    if (callId && callType) {
        Promise.all([callPr])
            .then(call => {
                if (call.stream._id.toString() === streamId) {
                    return Stream.findById(streamId)
                }
                const error = new Error("call is not for this stream or this stream does not have nay call request")
                error.statusCode = 422
                throw error
            })
            .then(stream => {
                const duration = (new Date(stream.createdAt).getTime() - new Date().getTime()) / 600000
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
            .then(stream => {
                // using .in so that everybody leaves the stream
                io.in(streamId).emit(socketEvents.deleteStreamRoom, { streamId, viewerId: call.viewer._id })
                res.status(200).json({
                    actionStatus: "success",
                    message: "stream ended successfully, If you have pending call, then please call the customer fast 👍👍🤘"
                })
            })
            .catch(err => next(err))
    } else {
        // model bored and cut the livestream by himself
        Stream.findById(streamId)
            .then(stream => {
                const duration = (new Date(stream.createdAt).getTime() - new Date().getTime()) / 600000
                stream.endReason = reason,
                    stream.status = "ended",
                    stream.duration = duration
                return save()
            })
            .then(stream => {
                // using .in so that everybody leaves the stream
                // and disconnect() manually hence leaving all the channels
                // and then reconnects
                io.in(streamId).emit(socketEvents.deleteStreamRoom, { streamId, viewerId: call.viewer._id })
                res.status(200).json({
                    actionStatus: "success",
                    message: "stream ended successfully"
                })
            })
            .catch(err => next(err))
    }
}

exports.handleViewerCallRequest = (req, res, next) => {
    // viewer must be authenticated
    // must have money >= min required

    const viewerId = req.user.relatedUser._id
    const { modelId, streamId, callType } = req.body
    let theCall = callType === "audioCall" ? AudioCall : VideoCall

    Stream.findById(streamId)
        .then(stream => {
            if (stream.model._id.toString() === modelId && stream.status !== "ended") {
                return Promise.all([
                    Model.findById(modelId),
                    Wallet.findOne({ _id: req.user.relatedUser.wallet._id })
                ])
            }
            const error = new Error("The stream has ended or the model does not belong to this stream or vice versa")
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
                    chargePerMin: callType === "audioCall" ? model.charges.audioCall : model.charges.videoCall,
                    minCallDuration: model.minCallDuration
                })
            }
            const error = new Error(`You do not have sufficient balance in your wallet to request ${callType}, ₹ ${minBalance} is required`);
            error.statusCode = 401
            throw error
        })
        .then(call => {
            // notify every viewer in the stream about the call request
            // no need to emit different event for model, he will handle,
            // this event differently in frontend itself
            const evt = callType === "audioCall" ? socketEvents.requestedAudiCall : socketEvents.requestedVideoCall
            io.getIO().to(streamId).emit(evt, {
                userName: req.user.userName,
                callType
            })
            io.getIO().join(callId)
            res.status(201).json({
                actionStatus: "success",
                message: `Request for ${callType} has been sent to the model, you will be notified when model accepts the call`,
                callId: call._id,
                callType
            })
        }).catch(err => next(err))
}

exports.handleModelAcceptedCallRequest = (req, res, next) => {
    // this end point wil be called when model accepts the call request
    // this is just for updating call doc and emitting event

    const { callId, streamId, callType, viewerUserName } = req.body
    let theCall = (callType === "audioCall") ? AudioCall : VideoCall
    let callDoc
    theCall.findById(callId)
        .then(call => {
            callDoc = call
            if (callDoc.model._id.toString() !== req.user.relatedUser._id) {
                if (callDoc.status !== ("ongoing" || "completed")) {
                    // deduct the minimum req charges from the user
                    // and transfer it to the model according to the share percentage

                    const modelWalletPr = Wallet.findOne({ relatedUser: callDoc.model })
                    const viewerWalletPr = Wallet.findOne({ relatedUser: callDoc.viewer })
                    return Promise.all([modelWalletPr, viewerWalletPr])
                }
                const error = new Error(`This ${callType} is has been already completed or on going with other user`)
                error.statusCode = 422
                throw error
            }
            const error = new Error(`You are not allowed this ${callType}, this ${callType} is for another model to take`)
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
            return Promise.all([modelWallet.save(), viewerWallet.save(), callDoc.save()])
        })
        .then(() => {
            const evt = callType === "audioCall" ? socketEvents.modelAcceptedAudioCallRequest : socketEvents.modelAcceptedVideoCallRequest
            // emit to everybody in stream that model accepted call
            /**
             * 🙏🙏🙏 the reciving client should save the call document details in LOCALSTOREAGE
             */
            io.getIO().to(streamId).emit(evt, { viewerUserName })
            io.to(io.getClient().id).emit(socketEvents.addedMoneyToWallet, { amount: minCharges * (model.sharePercent / 100) })
            // join call channel, viewer has already joined this channel
            io.getClient().join(callId)
            const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("viewer", req.user.relatedUser._id, callId, 60)

            return Promise.all([
                Viewer.updateOne({ _id: callDoc.viewer }, {
                    pendingCall: callDoc._id,
                    pendingCallType: callDoc.callType
                }),
                Model.updateOne({ _id: callDoc.viewer }, {
                    $push: callDoc.callType === "AudioCall" ? { "pendingCalls.$.audioCalls": callDoc._id } : { "pendingCalls.$.videoCalls": callDoc._id }
                })
            ])
                .then(values => {
                    console.debug("added pending calls >>>", values)
                    res.status(200).json({
                        actionStatus: "success",
                        rtcToken,
                        privilegeExpiredTs
                    })
                })
        })
        .catch(err => next(err))
}

exports.handleModelDeclineCallRequest = (req, res, next) => {
    const { callId, streamId, callType, viewerUserName, declineReason } = req.body
    let theCall = (callType === "audioCall") ? AudioCall : VideoCall
    theCall.findById(callId)
        .then(call => {
            if (call.model._id === req.user.relatedUser._id) {
                return theCall.findByIdAndRemove(callId)
            }
            const error = new Error("you are not alloted this call | declineHandler")
            error.statusCode = 401
            throw error
        })
        .then(call => {
            const evt = callType = "audioCall" ? socketEvents.modelDeclinedAudioCallRequest : socketEvents.modelDeclinedVideoCallRequest
            io.to(call.stream._id).emit(evt, { declineReason: declineReason && declineReason })
            // remove model and viewer from the callId room
            io.socketLeave(callId)
            return res.status(200).json({
                message: 'call was declined successfully by you',
                actionStatus: "success"
            })
        })
        .catch(err => next(err))
}

exports.setOngoing = (req, res, next) => {
    // endpoint to handle request of stream status update
    const { streamId } = req.body;

    Stream.findById(streamId)
        .then(stream => {
            if (stream.model._id === req.user.relatedUser._id) {
                stream.status = "ongoing"
                return stream.save()
            }
            const error = new Error("This stream does not belong to you hence you cannot change status of it")
            error.statusCode = 400
            throw error
        })
        .then(stream => {
            io.getClient().join(stream._id.toString())
            io.getIO().emit(socketEvents.streamCreated, {
                modelId: req.user._id,
                modelName: req.user.userName,
                streamId: stream._id,
            });
            res.status(200).json({
                message: "stream status set to ongoing, you are live to everyone now",
                actionStatus: "success",
            })
        })
        .catch(error => {
            throw error
        })
};