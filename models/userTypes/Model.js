const mongoose = require("mongoose")

const modelSchema = new mongoose.Schema({
  rootUser: {
    type: mongoose.Schema.Types.ObjectId,
    // required: true,
    unique: true,
    ref: "User",
  },
  approval: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Approval",
    default: null,
  },
  name: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    required: true,
    enum: ["Male", "Female", "Custom"],
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  dob: {
    // will store only year
    // i.e - birth year
    type: Number,
    required: true,
  },
  languages: [String],
  bio: {
    type: String,
    minlength: 20,
    maxlength: 512,
  },
  hobbies: {
    type: [String],
  },
  offLineMessage: {
    type: String,
    default: "This is default offline Message",
  },
  tipMenuActions: {
    actions: [
      {
        action: String,
        price: Number,
        timesTipped: {
          type: Number,
          default: 0,
        },
      },
    ],
    lastUpdated: {
      type: Date,
    },
  },
  sharePercent: Number /* Not in decimals, 90% === 90 not 0.9 */,
  adminPriceRange: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PriceRange",
  },
  charges: {
    audioCall: Number,
    videoCall: Number,
  },
  minCallDuration: {
    // in minutes
    type: Number,
    default: 2,
  },
  timeForAcceptingCall: {
    // in seconds
    type: Number,
    required: true,
    default: 30,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
  },
  onCall: {
    type: Boolean,
    default: false,
    index: true,
  },
  isStreaming: {
    type: Boolean,
    default: false,
    index: true,
  },
  currentStream: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stream",
  },
  profileImage: {
    type: String,
    required: true,
  },
  publicImages: {
    type: [String],
  },
  offlineStatus: {
    type: String,
    default: "I will soon come online, I Know you are waiting for me 🥰🥰",
  },
  backGroundImage: String,
  profileBg: String,
  privateImages: {
    type: Map,
    of: new mongoose.Schema({
      images: {
        type: [String],
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
    }),
  },
  streams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Streams",
    },
  ],
  videoCallHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VideoCall",
    },
  ],
  audioCallHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AudioCall",
    },
  ],
  pendingCalls: {
    audioCalls: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AudioCall",
      },
    ],
    videoCalls: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VideoCall",
      },
    ],
  },
  dailyIncome: [
    {
      date: Date,
      revenue: Number,
      netIncome: Number,
    },
  ],
  tags: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tag",
    },
  ],
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Wallet",
    unique: true,
    index: true,
  },
  ethnicity: {
    type: String,
    default: "Indian",
  },
  dynamicFields: {
    "hair color": String,
    "eye color": String,
    "body type": String,
    country: String,
  },
})

modelSchema.index(
  {
    name: "text",
    userName: "text",
    bio: "text",
    hobbies: "text",
  },
  {
    name: "ModelSearch index",
    weights: {
      name: 2,
      userName: 2,
    },
  }
)

const Model = new mongoose.model("Model", modelSchema)

module.exports = Model
