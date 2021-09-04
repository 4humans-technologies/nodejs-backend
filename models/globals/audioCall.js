const mongoose = require("mongoose");

const audioCallSchema = new mongoose.Schema({
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
        enum: ["model-accept-pending", "model-accepted-will-end-stream", "model-accepted-stream-ended", "viewer-call-not-received"]
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
    moneySpent:{
        type:Map,
        default:{
            onCall:0,
            onGift:{
                gitsCount:0,
                total:0
            }
        }
    }
})

const AudioCall = mongoose.model("AudioCall", audioCallSchema)
module.exports = AudioCall
