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
    enum: [
      "model-accept-pending",
      "model-accepted",
      "model-declined",
      "model-accepted-will-end-stream",
      "ongoing",
      "completed",
      "completed-and-billed",
      "viewer-call-not-received",
    ],
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
  sharePercent: {
    type: Number,
    default: 60,
  },
  endReason: {
    type: String,
    default: "network-error",
    enum: [
      "viewer-ended",
      "model-ended",
      "low-balance",
      "viewer-network-error",
      "model-network-error",
      "network-error",
    ],
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
