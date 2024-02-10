const mongoose = require("mongoose")

const streamSchema = new mongoose.Schema({
  model: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Model",
  },
  createdAt: {
    type: Date,
    default: Date,
  },
  status: {
    type: String,
    default: "initializing",
    enum: ["initializing", "ongoing", "ended"],
  },
  endReason: {
    type: String,
    default: "error",
    enum: ["audioCall", "videoCall", "manual", "error", "socket-disconnect"],
  },
  duration: Number /* seconds */,
  moneySpent: {
    type: Number,
    default: 0,
  },
  endCall: {
    callId: mongoose.Schema.Types.ObjectId,
    callType: {
      type: String,
      enum: ["audioCall", "videoCall"],
    },
  },
  viewers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Viewer",
    },
  ],
})

const Stream = mongoose.model("Stream", streamSchema)
module.exports = Stream
