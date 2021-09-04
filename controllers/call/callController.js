const AudioCall = require("../../models/globals/audioCall");
const VideoCall = require("../../models/globals/videoCall");
const Wallet = require("../../models/globals/wallet");
const Model = require("../../models/userTypes/Model");
const Viewer = require("../../models/userTypes/Viewer");
const socket = require("../../socket");
const socketEvents = require("../../utils/socket/socketEvents");

exports.handleModelAudioCallingToViewer = (req, res, next) => {
    // first give token to the model
    // emit model calling event in the <call._id> room

    // more security check needs to be implemented ❌❌❌❌
    const { modelId, callId, modelName } = req.body
    AudioCall.findById(callId)
        .then(call => {
            if (call.model._id.toString() === req.user.relatedUser._id) {
                if (call.status !== ("ongoing" || "completed")) {
                    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("model", modelId, callId, 60)

                    io.to(callId).emit(socketEvents.modelAudioCalling, { modelName, modelId, callId })
                    res.status(200).json({
                        actionStatus: "success",
                        rtcToken,
                        privilegeExpiredTs
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

exports.handleModelVideoCallingToViewer = (req, res, next) => {
    // first give token to the model
    // emit model calling event in the <call._id> room
    // more security check needs to be implemented ❌❌❌❌

    const { modelId, callId, modelName } = req.body
    VideoCall.findById(callId)
        .then(call => {
            if (call.model._id.toString() === req.user.relatedUser._id) {
                if (call.status !== ("ongoing" || "completed")) {
                    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("model", modelId, callId, 60)

                    io.to(callId).emit(socketEvents.modelVideoCalling, { modelName, modelId, callId })
                    res.status(200).json({
                        actionStatus: "success",
                        rtcToken,
                        privilegeExpiredTs
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
exports.handleModelCancelingVideoCalling = (req, res, next) => {
    // TODO:  more security check needs to be implemented ❌❌❌❌

    const { modelId, callId, modelName } = req.body
    io.to(callId).emit(socketEvents.modelCancelVideoCalling, { modelName, modelId, callId })
}
exports.handleModelCancelingAudioCalling = (req, res, next) => {
    // TODO: more security check needs to be implemented ❌❌❌❌

    const { modelId, callId, modelName } = req.body
    io.to(callId).emit(socketEvents.modelCancelAudioCalling, { modelName, modelId, callId })
}

exports.handleViewerAcceptingVideoCalling = (req, res, next) => {
    const { callId } = req.body
    VideoCall.findById(callId)
        .then(call => {
            if (call.viewer._id.toString() !== req.user.relatedUser._id) {
                if (call.status !== ("ongoing" || "completed")) {
                    // deduct the minimum req charges from the user
                    // and transfer it to the model according to the share percentage

                    const modelPr = Model.findById(call.model._id)
                    const viewerPr = Viewer.findById(call.viewer._id)
                    const modelWalletPr = Wallet.findOne({ relatedUser: call.model })
                    const viewerWalletPr = Wallet.findOne({ relatedUser: call.viewer })

                    return Promise.all([modelPr, viewerPr, modelWalletPr, viewerWalletPr])
                }
                const error = new Error("This video call is has been already completed or on going with other user")
                error.statusCode = 422
                throw error
            }
            const error = new Error("You are not allowed this call, this call is for another viewer to take")
            error.statusCode = 401
            throw error
        })
        .then(([model, viewer, modelWallet, viewerWallet]) => {
            const minCharges = model.charges * model.minDuration
            try {
                viewerWallet.deductAmount(minCharges)
            } catch (error) {
                next(error)
            }
            modelWallet.addAmount(minCharges * (model.sharePercent / 100))
            // rest add to the admin wallet
            // TODO: transfer coins to admin also
            
            return Promise.all([modelWallet.save(), viewerWallet.save()])
        })
        .then(() => {
            io.to(callId).emit(socketEvents.addedMoneyToWallet, { amount: minCharges * (model.sharePercent / 100) })
            
            const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("viewer", req.user.relatedUser._id, callId, 60)
            io.to(callId).emit(socketEvents.viewerAcceptedVideoCalling, {})
            res.status(200).json({
                actionStatus: "success",
                rtcToken,
                privilegeExpiredTs
            })
        })
        .catch(err => next(err))
}

exports.handleViewerAcceptingAudioCalling = (req, res, next) => {
    const { callId } = req.body
    AudioCall.findById(callId)
        .then(call => {
            if (call.viewer._id.toString() !== req.user.relatedUser._id) {
                if (call.status !== ("ongoing" || "completed")) {
                    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("viewer", req.user.relatedUser._id, callId, 60)
                    io.to(callId).emit(socketEvents.viewerAcceptedVideoCalling, {})
                    res.status(200).json({
                        actionStatus: "success",
                        rtcToken,
                        privilegeExpiredTs
                    })
                }
                const error = new Error("This video call is has been already completed or on going with other user")
                error.statusCode = 422
                throw error
            }
            const error = new Error("You are not allowed this call, this call is for another viewer to take")
            error.statusCode = 401
            throw error
        })
        .catch(err => next(err))
}

exports.onCallTokenRenew = (req, res, next) => {
    const { userType } = req.user
    const { callId, callType } = req.body

    let call = callType === "audioCall" ? AudioCall : VideoCall
    call.findById(callId)
        .then(call => {
            if (userType === "Model" ? call.model._id.toString() === req.user.relatedUser._id : call.viewer._id.toString() === req.user.relatedUser._id) {
                if (call.status !== ("ongoing" || "completed")) {
                    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(useType.toLowerCase(), req.user.relatedUser._id, callId, 60)
                    res.status(200).json({
                        actionStatus: "success",
                        rtcToken,
                        privilegeExpiredTs
                    })
                }
                const error = new Error("This video call is has been already completed or on going with other user")
                error.statusCode = 422
                throw error
            }
            const error = new Error("You are not alloted this call how can you try to renew token for it")
            error.statusCode = 401
            throw error
        }).catch(err => next(err))
}

exports.validityPollingHandler = (req, res, next) => {
    // model will poll the server every 1st second
    // of the new minute of the call and report info
    // to the server about the call

    const { duration, callId, callType }

}