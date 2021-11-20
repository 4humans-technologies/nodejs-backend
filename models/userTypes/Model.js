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
  languages: {
    type: [String],
    default: ["Hindi"],
  },
  bio: {
    type: String,
    minlength: 20,
    maxlength: 512,
    default: "I'am a super cool girl 😘😘💘",
  },
  hobbies: {
    type: [String],
    default: [],
  },
  tags: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tag",
    },
  ],
  ethnicity: {
    type: String,
    default: "Indian",
  },
  hairColor: {
    type: String,
    index: true,
    default: "",
  },
  eyeColor: {
    type: String,
    index: true,
    default: "",
  },
  country: {
    type: String,
    index: true,
    default: "",
  },
  bodyType: {
    type: String,
    index: true,
    default: "",
  },
  skinColor: {
    type: String,
    index: true,
    default: "",
  },
  topic: {
    type: String,
    default: "Hello guys, today's stream will be super, so dont't go away",
  },
  privateCallActivity: {
    type: [String],
    default: [],
  },
  dynamicFields: {
    type: [
      {
        name: {
          type: String,
          required: true,
        },
        displayName: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
      },
    ],
    default: [],
  },
  tipMenuActions: {
    actions: {
      type: [
        {
          action: String,
          price: Number,
        },
      ],
      default: [],
    },
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
  documents: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    index: true,
  },
  profileImage: {
    type: String,
    required: true,
  },
  publicImages: {
    type: [String],
    default: [],
  },
  privateImages: {
    type: [String],
    default: [],
  },
  publicVideos: {
    type: [String],
    default: [],
  },
  privateVideos: {
    type: [String],
    default: [],
  },
  offlineStatus: {
    /**
     * offline message is the actually the more right name
     */
    type: String,
    default: "I will soon come online, I Know you are waiting for me 🥰🥰",
  },
  backGroundImage: String,
  coverImage: String,
  // privateImages: {
  //   type: Map,
  //   of: new mongoose.Schema({
  //     images: {
  //       type: [String],
  //       required: true,
  //     },
  //     price: {
  //       type: Number,
  //       required: true,
  //     },
  //   }),
  // },
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
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Wallet",
    unique: true,
    index: true,
  },
  privateChats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModelViewerPrivateChat",
    },
  ],
})

modelSchema.index(
  {
    name: "text",
    userName: "text",
    bio: "text",
    ethnicity: "text",
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
