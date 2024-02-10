const AudioCall = require("../../models/globals/audioCall");
const VideoCall = require("../../models/globals/videoCall");
const Wallet = require("../../models/globals/wallet");
const Model = require("../../models/userTypes/Model");
const Viewer = require("../../models/userTypes/Viewer");
const socket = require("../../socket");
const io = require("../../socket");
const socketEvents = require("../../utils/socket/socketEvents");

exports.handleModelCallingToViewer = (req, res, next) => {
    // first give token to the model
    // emit model calling event in the <call._id> room

    // more security check needs to be implemented ❌❌❌❌
    const { modelId, callId, modelName, callType } = req.body
    const theCall = callType === "audioCall" ? AudioCall : VideoCall
    io.getClient().join(callId)

    theCall.findById(callId)
        .then(call => {
            if (call.model._id.toString() === req.user.relatedUser._id) {
                if (call.status !== "ongoing" || call.status !== "completed") {
                    const evt = callType === "audioCall" ? socketEvents.modelAudioCalling : socketEvents.modelVideoCalling
                    io.to(callId).emit(evt, { modelName, modelId, callId })
                    res.status(200).json({
                        actionStatus: "success",
                    })
                }
                const error = new Error("This video call is has been already created")
                error.statusCode = 422
                throw error
            }
            const error = new Error("You are not alloted this call, this call is for another model to take")
            error.statusCode = 401
            throw error
        }).catch(err => next(err))
}

exports.handleModelCancelingCall = (req, res, next) => {
    // TODO:  more security check needs to be implemented ❌❌❌❌

    const { callId, modelName, callType } = req.body
    const theCall = callType === "audioCall" ? AudioCall : VideoCall

    theCall.findById(callId)
        .then(call => {
            if (call.model._id.toString() === req.user.relatedUser._id) {
                if (call.status !== "ongoing" || call.status !== "completed") {
                    const evt = callType === "audioCall" ? socketEvents.modelCancelAudioCalling : socketEvents.modelCancelVideoCalling
                    io.to(callId).emit(evt, { modelName, modelId: req.user.relatedUser._id, callId })
                    res.status(200).json({
                        message: "This call was canceled by you",
                        actionStatus: "success"
                    })
                }
            }
        })
        .catch(err => next(err))
}

exports.onCallTokenRenew = (req, res, next) => {
    const { userType } = req.user
    const { callId, callType } = req.body

    let theCall = callType === "audioCall" ? AudioCall : VideoCall
    theCall.findById(callId)
        .then(call => {
            if (userType === "Model" ? call.model._id === req.user.relatedUser._id : call.viewer._id === req.user.relatedUser._id) {
                if (call.status !== "ongoing" || call.status !== "completed") {
                    if ((new Date().getTime() - new Date()) / 1000 < 63) {
                        const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(useType.toLowerCase(), req.user.relatedUser._id, callId, 60)
                        res.status(200).json({
                            actionStatus: "success",
                            rtcToken,
                            privilegeExpiredTs
                        })
                    }
                    const error = new Error("more 63 seconds of difference is not acceptable some mischief is being done by you,😏😏😏")
                    error.statusCode = 401
                    throw error
                }
                if (call.endReason !== "low-balance") {
                    const error = new Error("This video call is has been already completed or on going with other user")
                    error.statusCode = 422
                    throw error
                }
                // implies the call was automatically cancelled by server automatically
                io.in(call._id).emit(socketEvents.callHasEnded, { callId: call._id, modelId: call.model._id, viewerId: call.viewer._id })
                res.status(401).json({
                    actionStatus: "failed",
                    message: "call was automatically cut from server due to low balance!"
                })
            }
            const error = new Error("You are not alloted this call how can you try to renew token for it")
            error.statusCode = 401
            throw error
        }).catch(err => next(err))
}

exports.giveTokenForCallStart = (req, res, next) => {
    const { callId, callType } = req.body
    let theCall = (callType === "audioCall") ? AudioCall : VideoCall

    theCall.findById(callId)
        .then(call => {
            // check if the model/viewer are alloted to this call
            if (userType === "Model" ? call.model._id === req.user.relatedUser._id : call.viewer._id === req.user.relatedUser._id && (call.status !== "ongoing" || call.status !== "completed")) {
                // generate token now
                const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(req.user.userType.toLowerCase(), req.user.relatedUser._id, callId, 60)
                if (req.user.userType === "Viewer") {
                    io.to(callId).emit(socketEvents.viewerAcceptedCall, { callType, callId })
                }
                res.status(200).json({
                    actionStatus: "success",
                    rtcToken,
                    privilegeExpiredTs
                })
            }
            const error = new Error("you are not authorized to start or participate in this call")
            error.statusCode = 401
            throw error
        }).catch(err => next(err))
}

exports.callStartedHandler = (req, res, next) => {
    // this endpoint called by model, for reporting the timestamp
    // at which call has started and emitting that to the viewer

    const { callId, callType, startTimestamp } = req.body
    const theCall = callType === "audioCall" ? AudioCall : VideoCall

    theCall.findById(callId)
        .then(call => {
            if (call.model._id === req.user.relatedUser._id) {
                io.getIO().to(callId).emit(socketEvents.callHasStarted, { callId, startTimestamp })
            }
            const error = new Error("This situation should have come, something is not right | model not alloted to call")
            error.statusCode = 401
            throw err
        })
        .catch(err > next(err))
}

exports.validityPollingHandler = (req, res, next) => {
    // model will poll the server every 1st second
    // of the new minute of the call and report info
    // to the server about the call

    const { callId, callType, timestamp, viewerId } = req.body

    const theCall = callType === "audioCall" ? AudioCall : VideoCall

    Promise.all([
        theCall.findById(callId),
        Wallet.findOne({ _id: viewerId }, "currentAmount relatedUser")
    ])
        .then(({ call, wallet }) => {
            if (call.model._id === req.user.relatedUser._id && call.viewer._id.toString === viewerId) {
                if (call.status !== ("ongoing" || "completed")) {
                    const callMins = (new Date(timestamp).getTime() - new Date(call.statedAt).getTime()) / 60000
                    call.lastPolled = new Date(timestamp).toISOString()
                    call.callDuration = callMins

                    // charge and time calculation
                    const remainingBalance = wallet.currentAmount - (callMins * call.chargePerMin)
                    if (remainingBalance / call.chargePerMin < 1) {
                        const autoEndTimer = setTimeout(() => {
                            // end the call automatically
                            let callDuration;
                            let callCharges;
                            Promise.all([
                                Wallet.findOne({ _id: call.viewer._id }),
                                Wallet.findOne({ _id: call.model._id }),
                                Model.findById(call.model._id, "sharePercent")
                            ])
                                .then(({ viewerWallet, modelWallet, model }) => {
                                    callDuration = Math.ceil((new Date(timestamp).getTime() - new Date(call.statedAt).getTime()) / 60000)
                                    callCharges = callDuration * call.chargePerMin
                                    viewerWallet.deductAmount(callCharges)
                                    modelWallet.addAmount(callCharges * (model.sharePercent / 100))
                                    return Promise.all([
                                        viewerWallet.save(),
                                        modelWallet.save()
                                    ])
                                })
                                .then(values => {
                                    io.in(call._id).emit(socketEvents.callHasEnded, { callId: call._id, modelId: call.model._id, viewerId: call.viewer._id, callDuration, callCharges })
                                    return res.status(200).json({
                                        message: "call disconnected due to low-balance",
                                        actionStatus: "success",
                                        callDuration,
                                        callCharges
                                    })
                                })
                                .catch(err => next(err))
                        }, Math.floor((remainingBalance / call.chargePerMin) * 60))
                    } else {
                        return call.save()
                    }
                }
                const error = new Error("This video call is has been already completed or on going with other user | poling")
                error.statusCode = 422
                throw error
            }
            const error = new Error("You are not alloted this call how can you try to renew token for it | poling")
            error.statusCode = 401
            throw error
        })
        .then(call => {
            res.status(200).json({
                actionStatus: "success"
            })
        })
        .catch(err => next(err))
}

exports.callEndHandler = (req, res, next) => {
    // call can only be cancelled by the viewer or SERVER
    const { callId, callType, timestamp } = req.body

    let theCall = callType === "audioCall" ? AudioCall : VideoCall
    let call;
    let callDuration;
    let callCharges;
    theCall.findById(callId)
        .then(a => {
            call = a
            if (call.viewer._id === req.user.relatedUser._id) {
                if (call.status !== ("ongoing" || "completed")) {
                    return Promise.all([
                        Wallet.findOne({ _id: call.viewer._id }),
                        Wallet.findOne({ _id: call.model._id }),
                        Model.findById(call.model._id, "sharePercent")
                    ])
                }
                const error = new Error("This video call is has been already completed or on going with other user")
                error.statusCode = 422
                throw error
            }
        })
        .then(({ viewerWallet, modelWallet, model }) => {
            callDuration = Math.ceil((new Date(timestamp).getTime() - new Date(call.statedAt).getTime()) / 60000)
            callCharges = callDuration * call.chargePerMin
            viewerWallet.deductAmount(callCharges)
            modelWallet.addAmount(callCharges * (model.sharePercent / 100))
            return Promise.all([
                viewerWallet.save(),
                modelWallet.save()
            ])
        })
        .then(values => {
            res.status(200).json({
                message: "call disconnected successfully",
                actionStatus: "success",
                callDuration,
                callCharges
            })
        })
        .catch(err => next(err))
}