const mongoose = require("mongoose")

const modelSchema = new mongoose.Schema({
  rootUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Viewer",
      select: false,
    },
  ],
  numberOfFollowers: {
    type: Number,
    default: 0,
  },
  approval: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Approval",
    select: false,
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
    select: false,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true,
    select: false,
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
  bannedStates: {
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
  callActivity: {
    audioCall: [String],
    videoCall: [String],
  },
  dynamicFields: {
    type: [
      {
        _id: false,
        name: {
          type: String /* reference name for backend */,
          required: true,
        },
        displayName: {
          type: String /* what viewer will see */,
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
  adminRemark: {
    type: String,
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
    validate: {
      validator: Number.isInteger,
      message: "{VALUE} is not an integer value",
    },
  } /* Not in decimals, 90% === 90 not 0.9 */,
  adminPriceRange: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PriceRange",
    select: false,
  },
  charges: {
    audioCall: {
      type: Number,
      /* 🔻🔻 remove in production 🔻🔻 */
      default: 50,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    videoCall: {
      type: Number,
      /* 🔻🔻 remove in production 🔻🔻 */
      default: 80,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
  },
  minCallDuration: {
    // in minutes
    type: Number,
    /* 🔻🔻 remove in production 🔻🔻 */
    default: 2,
    validate: {
      validator: Number.isInteger,
      message: "{VALUE} is not an integer value",
    },
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
  },
  documents: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    select: false,
  },
  profileImage: {
    type: String,
    required: true,
  },
  publicImages: {
    type: [String],
    default: [],
  },
  publicVideos: {
    type: [String],
    default: [],
  },
  privateImages: [{ type: mongoose.Schema.Types.ObjectId, ref: "ImageAlbum" }],
  privateVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "VideoAlbum" }],
  offlineStatus: {
    /**
     * offline message is the actually the more right name
     */
    type: String,
    default: "I will soon come online, I Know you are waiting for me 🥰🥰",
    maxlength: 164,
  },
  backGroundImage: {
    type: String,
    default: "",
  },
  coverImage: {
    type: String,
    default: "",
  },
  streams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Streams",
      select: false,
    },
  ],
  videoCallHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VideoCall",
      select: false,
    },
  ],
  audioCallHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AudioCall",
      select: false,
    },
  ],
  pendingCalls: {
    audioCalls: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AudioCall",
        select: false,
      },
    ],
    videoCalls: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VideoCall",
        select: false,
      },
    ],
  },
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Wallet",
    select: false,
  },
  bankDetails: {
    bankName: {
      type: String,
      default: "",
      select: false,
    },
    IfscCode: {
      type: String,
      default: "",
      select: false,
    },
    holderName: {
      type: String,
      default: "",
      select: false,
    },
    accountNumber: {
      type: Number,
      select: false,
    },
    accountType: {
      type: String,
      enum: ["savings", "current"],
      default: "savings",
      select: false,
    },
  },
  privateChats: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ModelViewerPrivateChat",
      select: false,
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
