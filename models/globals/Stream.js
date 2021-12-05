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
    required: true,
    default: "initializing",
    enum: ["initializing", "ongoing", "ended"],
    index: true,
  },
  endReason: {
    type: String,
    required: true,
    default: "Error",
    enum: ["AudioCall", "VideoCall", "Manual", "Error", "socket-disconnect"],
  },
  meta: {
    duration: Number,
    moneySpent: Number,
    viewerCount: {
      /**
       * will store the peak number of users ever joined
       */
      type: Number,
      default: 0,
    },
  },
  // meta: {
  //     type: new mongoose.Schema({
  //         duration: Number,
  //         moneySpent: Number,
  //         gifts: [{
  //             type: Map,
  //             of: String
  //         }],
  //         viewerCount: Number,
  //     }),
  //     default: () => ({})
  // },
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
