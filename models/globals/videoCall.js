const mongoose = require("mongoose")

const videoCallSchema = new mongoose.Schema({
  model: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Model",
    index: true,
  },
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Viewer",
  },
  stream: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Stream",
  },
  status: {
    type: String,
    required: true,
    default: "model-accept-pending",
    enum: [
      "model-accept-pending",
      "model-accepted",
      "model-declined",
      "model-accepted-will-end-stream",
      "model-accepted-stream-ended",
      "ongoing",
      "completed",
      "viewer-call-not-received",
    ],
    index: true,
  },
  callDuration: {
    type: Number,
    default: 0,
    required: true,
  },
  chargePerMin: {
    type: Number,
    required: true,
  },
  minCallDuration: {
    type: Number,
    required: true,
  },
  tokenGifted: {
    type: [Number],
  },
  lastPolled: Date,
  startedAt: {
    type: Date,
    default: null,
  },
  endReason: {
    type: String,
    default: "network-error",
    enum: ["manual", "low-balance", "network-error"],
  },
  startTimeStamp: Number,
  endTimeStamp: Number,
  concurrencyControl: {
    type: [Number],
    default: [0],
  },
})

const VideoCall = mongoose.model("VideoCall", videoCallSchema)
module.exports = VideoCall
