const mongoose = require("mongoose")

const streamSchema = new mongoose.Schema({
  model: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "userType",
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date,
  },
  status: {
    type: String,
    default: "initializing",
    enum: ["initializing", "ongoing", "ended"],
    index: true,
  },
  endReason: {
    type: String,
    default: "Error",
    enum: ["AudioCall", "VideoCall", "Manual", "Error", "socket-disconnect"],
  },
  meta: {
    duration: Number,
    moneySpent: Number,
  },
  endAudioCall: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AudioCall",
    default: null,
  },
  endVideoCall: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VideoCall",
    default: null,
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
