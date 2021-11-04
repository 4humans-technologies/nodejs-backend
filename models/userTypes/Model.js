const mongoose = require("mongoose")

const modelSchema = new mongoose.Schema({
  rootUser: {
    type: mongoose.Schema.Types.ObjectId,
    // required: true,
    ref: "User",
    unique: true,
    index: true,
  },
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Viewer",
    },
  ],
  numberOfFollowers: {
    type: Number,
    default: 0,
  },
  approval: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Approval",
    default: null,
    unique: true,
    index: true,
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
    index: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true,
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
  tipMenuActions: {
    actions: [
      {
        action: String,
        price: Number,
      },
    ],
    lastUpdated: {
      type: Date,
    },
  },
  sharePercent: {
    type: Number,
    /* 🔻🔻 remove in production 🔻🔻 */
    default: 60 /* amount model will give to admin */,
  } /* Not in decimals, 90% === 90 not 0.9 */,
  adminPriceRange: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PriceRange",
  },
  charges: {
    audioCall: {
      type: Number,
      /* 🔻🔻 remove in production 🔻🔻 */
      default: 50,
    },
    videoCall: {
      type: Number,
      /* 🔻🔻 remove in production 🔻🔻 */
      default: 80,
    },
  },
  minCallDuration: {
    // in minutes
    type: Number,
    /* 🔻🔻 remove in production 🔻🔻 */
    default: 2,
  },
  timeForAcceptingCall: {
    // in seconds
    type: Number,
    /* 🔻🔻 remove in production 🔻🔻 */
    default: 30,
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    /* 🔻🔻 remove in production 🔻🔻 */
    default: 4.5,
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
    index: true,
  },
  profileImage: {
    type: String,
    required: true,
  },
  publicImages: {
    type: [String],
  },
  offlineStatus: {
    /**
     * offline message is the actually the more right name
     */
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
