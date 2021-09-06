const UnAuthedViewer = require("../../models/userTypes/UnAuthedViewer")
const controllerErrorCollector = require("../../utils/controllerErrorCollector")
const rtcTokenGenerator = require("../../utils/rtcTokenGenerator")
const Stream = require("../../models/globals/Stream")
const Model = require("../../models/userTypes/Model")
const { Types } = require('mongoose')
const Viewer = require("../../models/userTypes/Viewer")
const io = require("../../socket")
const socketEvents = require("../../utils/socket/socketEvents")

exports.createStreamAndToken = (req, res, next) => {
    // create stream and generate token for model
    // this end point will be called by the model

    controllerErrorCollector(req)
    const { modelId, modelUserId } = req.body
    // will keep channel as modelID
    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("model", req.user.relatedUser._id, req.user.relatedUser._id)
    // check if the model is approved or not,
    // by making a new model approval checker

    let theStream;
    Stream({
        model: req.user.relatedUser._id,
        createdAt: new Date().toISOString()
    })
        .save()
        .then(stream => {
            theStream = stream
            return Model.findOneAndUpdate({ _id: req.user.relatedUser._id },
                {
                    isStreaming: true,
                    currentStream: stream._id,
                    $push: { streams: stream }
                })
        })
        .then(model => {
            // io.join(theStream._id)
            // everybody will get the notification of new stream
            io.getIO().emit(socketEvents.streamCreated, { modelId:modelId, modelName:model.screenName, streamId:theStream._id })
            res.status(200).json({
                actionStatus: "success",
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
                streamId: theStream._id
            })
        })
        .catch(err => next(err))
}

exports.genRtcTokenViewer = (req, res, next) => {
    // for viewer who are loggedIn, and want to view model stream
    // just generate token and update stats
    controllerErrorCollector(req)

    const { viewerId, channel, streamId } = req.body
    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("viewer", viewerId, channel)

    const streamPr = Stream.findOneAndUpdate({ _id: streamId }, {
        $push: {
            viewers: Types.ObjectId(viewerId)
        },
        $inc: {
            "meta.viewerCount": 1
        }

    })

    const viewerPr = Viewer.update({
        _id: viewerId
    }, {
        $push: { streams: Types.ObjectId(streamId) }
    })

    Promise.all([streamPr, viewerPr])
        .then(values => {
            // socket emit events
            // io.join(streamId)
            io.getIO().to(streamId).emit(socketEvents.viewerJoined, {viewerCount:values[0].get("meta.viewerCount")})
            
            // http response
            res.status(200).json({
                actionStatus: "success",
                rtcToken: rtcToken,
                privilegeExpiredTs: privilegeExpiredTs,
                viewerCount: values[0].get("meta.viewerCount")
            })
        }).catch(err => next(err))
}


exports.generateRtcTokenUnauthed = (req, res, next) => {
    controllerErrorCollector(req)
    // will run when unauthed user try to view models live stream, not when he enters the website
    // create unAuthed user and generate token
    const { channel, modelId , streamId } = req.body

    UnAuthedViewer({
        sessions: 1,
        streamViewed: 1,
        timeSpent: 1,
        lastAccess: new Date().toISOString()
    })
        .save()
        .then(viewer => {
            return Stream.findOneAndUpdate({ _id: streamId }, {
                $push: {
                    unAuthedViewers: Types.ObjectId(viewer._id)
                },
                $inc: {
                    "meta.viewerCount": 1
                }
            })
        })
        .then(stream => {
            const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("viewer", viewer._id, channel)
            
            // socket emit event
            // io.join(streamId)
            io.getIO().to(streamId).emit(socketEvents.viewerJoined, {viewerCount:values[0].get("meta.viewerCount")})
    
            res.status(201).json({
                actionStatus: "success",
                rtcToken: rtcToken,
                uid: viewer._id,
                privilegeExpiredTs: privilegeExpiredTs
            })
        })
        .catch(err => next(err))
}

exports.renewRtcTokenGlobal = (req, res, next) => {
    // renew token for anybody be model or viewer or unAuthed viewer
    controllerErrorCollector(req)
    const { channel, relatedUserId } = req.body
    if (!req.user) {
        UnAuthedViewer.findOne({ _id: relatedUserId })
            .then(viewer => {
                if (!viewer) {
                    const err = new Error("Not Authorized")
                    err.statusCode = 401
                    throw err
                }
                const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("unAuthed", relatedUserId, channel)
                return res.status(200).json({
                    actionStatus: "success",
                    rtcToken: rtcToken,
                    privilegeExpiredTs: privilegeExpiredTs
                })
            }).catch(err => next(err))
    }

    if (req.user.userType === "Viewer") {
        const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("viewer", relatedUserId, channel)
    } else if (req.user.userType === "Model") {
        const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator("model", relatedUserId, channel)
    }

    res.status(200).json({
        actionStatus: "success",
        rtcToken: rtcToken,
        privilegeExpiredTs: privilegeExpiredTs
    })
}