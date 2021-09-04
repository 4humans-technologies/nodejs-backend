const AudioCall = require("../../models/globals/audioCall")
const Stream = require("../../models/globals/Stream")
const VideoCall = require("../../models/globals/videoCall")
const Wallet = require("../../models/globals/wallet")
const Model = require("../../models/userTypes/Model")
const Viewer = require("../../models/userTypes/Viewer")
const io = require("../../socket")
const socketEvents = require("../../utils/socket/socketEvents")


exports.endStream = (req, res, next) => {
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
                if(call.stream._id.toString() === streamId){
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
                stream.set("meta.duration", duration)

                if (callType === "audioCall") {
                    stream.endAudioCall = call
                } else {
                    stream.endVideoCall = call
                }
                return save()
            })
            .then(stream => {
                // using .in so that everybody leaves the stream
                io.in(streamId).emit(socketEvents.deleteStreamRoom, { streamId })
                res.status(200).json({
                    actionStatus: "success",
                    message: "stream ended successfully"
                })
            })
            .catch(err => next(err))
    } else {
        // model bored and cut the livestream
        Stream.findById(streamId)
            .then(stream => {
                const duration = (new Date(stream.createdAt).getTime() - new Date().getTime()) / 600000
                stream.endReason = reason,
                    stream.status = "ended",
                    stream.set("meta.duration", duration)

                return save()
            })
            .then(stream => {
                // using .in so that everybody leaves the stream
                // and disconnect() manually hence leaving all the channels
                // and then reconnects
                io.in(streamId).emit(socketEvents.deleteStreamRoom, { streamId })
                
                res.status(200).json({
                    actionStatus: "success",
                    message: "stream ended successfully"
                })
            })
            .catch(err => next(err))
    }
}

exports.handleAudioCallRequest = (req, res, next) => {
    // viewer must be authenticated
    // must have money >= min required

    const { viewerId, modelId, StreamId } = req.body

    Promise.all([
        Model.findById(modelId),
        Wallet.findOne({ _id: req.user.relatedUser.wallet._id })
    ])
        .then(({ model, wallet }) => {
            const minBalance = model.get("charges.audioCall") * model.minCallDuration
            if (wallet.currentAmount >= minBalance) {
                return AudioCall({
                    model: model,
                    viewer: viewerId,
                    stream: streamId,
                    status: "model-accept-pending",
                    chargePerMin: model.get("charges.audioCall"),
                    minCallDuration: model.minCallDuration
                }).save()
            }
            const error = new Error(`You do not have sufficient balance in your wallet, ₹ ${minBalance} is required`);
            error.statusCode = 401
            throw error
        })
        .then(call => {
            // notify every viewer in the stream about the call request
            // no need to emit different event for model, he will handle,
            // this event differently in frontend itself
            io.getIO().to(streamId).emit(socketEvents.requestedVideoCall, {
                username: req.user.username,
                userId: req.user._id,
                viewerId: req.user.relatedUser._id,
                callId: call._id,
                callType: "AudioCall"
            })

            res.status(200).json({
                actionStatus: "success",
                message: "call request is sent to the model",
                callId: call._id,
                callType: "AudioCall"
            })

        })
        .catch(err => next(err))
}

exports.handleVideoCallRequest = (req, res, next) => {
    // viewer must be authenticated
    // must have money >= min required

    const { viewerId, modelId, StreamId } = req.body

    Promise.all([
        Model.findById(modelId),
        Wallet.findOne({ _id: req.user.relatedUser.wallet._id })
    ])
        .then(({ model, wallet }) => {
            const minBalance = model.get("charges.videoCall") * model.minCallDuration
            if (wallet.currentAmount >= minBalance) {
                return VideoCall({
                    model: model,
                    viewer: viewerId,
                    stream: streamId,
                    status: "model-accept-pending",
                    chargePerMin: model.get("charges.videoCall"),
                    minCallDuration: model.minCallDuration
                }).save()
            }
            const error = new Error(`You do not have sufficient balance in your wallet, ₹ ${minBalance} is required`);
            error.statusCode = 401
            throw error
        })
        .then(call => {
            // notify every viewer in the stream about the call request
            // no need to emit different event for model, he will handle,
            // this event differently in frontend itself
            io.getIO().to(streamId).emit(socketEvents.requestedVideoCall, {
                username: req.user.username,
                userId: req.user._id,
                viewerId: req.user.relatedUser._id,
                callId: call._id,
                callType: "VideoCall"
            })

            res.status(200).json({
                actionStatus: "success",
                message: "call request is sent to the model",
                callId: call._id,
                callType: "VideoCall"
            })
        })
        .catch(err => next(err))
}

exports.modelAcceptedVideoCallRequest = (req, res, next) => {
    //this end point wil be called when model accepts the call request
    // this just for updating call doc and emitting event

    const { callId, streamId } = req.body
    VideoCall.findOneAndUpdate({ _id: callId }, {
        status: "model-accepted-will-end-stream"
    })
        .then(call => {
            io.getIO().to(streamId).emit(socketEvents.modelAcceptedVideoCall, { streamId, modelId })
            res.status(200).json({
                actionStatus: "success",
                message: "Please end the stream, and call the viewer"
            })
        })
        .catch(err => next(err))

}

exports.modelAcceptedAudioCallRequest = (req, res, next) => {
    const { callId, streamId } = req.body
    AudioCall.findOneAndUpdate({ _id: callId }, {
        status: "model-accepted-will-end-stream"
    })
        .then(call => {
            io.getIO().to(streamId).emit(socketEvents.modelAcceptedVideoCall, { streamId, modelId })
            res.status(200).json({
                actionStatus: "success",
                message: "Please end the stream, and call the viewer"
            })
        })
        .catch(err => next(err))
}