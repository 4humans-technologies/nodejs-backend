const mongoose = require("mongoose");

const videoCallSchema = new mongoose.Schema({
    model: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Model",
        index: true
    },
    viewer: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Viewer",
    },
    stream: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Stream"
    },
    status: {
        type: String,
        required: true,
        default: "model-accept-pending",
        enum: ["model-accept-pending", "model-accepted", "model-accepted-stream-ended","ongoing", "completed","viewer-call-not-received"],
        index:true
    },
    callDuration: {
        type: Number,
        default: 0,
        required: true
    },
    chargePerMin: {
        type: Number,
        required: true
    },
    minCallDuration: {
        type: Number,
        required: true
    },
    gifts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Gifts"
    }],
    moneySpent: {
        type: Map,
        default: {
            onCall: 0,
            onGift: {
                gitsCount: 0,
                total: 0
            }
        }
    }
}, { timestamps: true })

const VideoCall = mongoose.model("VideoCall", videoCallSchema)
module.exports = VideoCall
