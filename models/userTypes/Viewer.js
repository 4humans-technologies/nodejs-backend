const mongoose = require("mongoose");
const User = require("../User");

const viewerSchema = new mongoose.Schema({
  rootUser: {
    type: mongoose.Schema.Types.ObjectId,
    // required: true,
    ref: "User",
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  gender: {
    type: String,
    required: true,
    enum: ["Male", "Female", "Custom"],
  },
  profileImages: {
    type: String,
    required: false,
  },
  hobbies: {
    type: [String],
    required: false,
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Wallet",
    unique: true,
    index: true,
  },
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model",
    },
  ],
  streams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Streams",
    },
  ],
  purchaseHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "coinPurchase",
    },
  ],
  giftHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "giftPurchase",
    },
  ],
  videoCallHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videoCall",
    },
  ],
  audioCallHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "audioCall",
    },
  ],
  pendingCallType: {
    type: String,
    enum: ["AudioCall", "VideoCall"],
  },
  pendingCall: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "pendingCallType",
  },
});

const Viewer = mongoose.model("Viewer", viewerSchema);

module.exports = Viewer;
