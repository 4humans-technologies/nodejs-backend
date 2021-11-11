const mongoose = require("mongoose")
const User = require("../User")

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
    index: true,
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
  isChatPlanActive: {
    type: Boolean,
    default: false,
  },
  currentChatPlan: {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PrivateChatPlan",
    },
    willExpireOn: Number /* timestamp */,
    purchasedOn: {
      type: Date,
    },
  },
  previousChatPlans: {
    type: [
      {
        planId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PrivateChatPlan",
        },
        purchasedOn: {
          type: Date,
          required: true,
        },
      },
    ],
    default: [],
  },
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
  privateChats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModelViewerPrivateChat",
    },
  ],
})

const Viewer = mongoose.model("Viewer", viewerSchema)

module.exports = Viewer
