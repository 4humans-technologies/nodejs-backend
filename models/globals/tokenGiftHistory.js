const mongoose = require("mongoose")

const tokenGiftHistorySchema = new mongoose.Schema({
  time: {
    type: Date,
    default: () => new Date(),
  },
  tokenAmount: {
    type: Number,
    required: true,
  },
  forModel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Model",
    required: true,
  },
  by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Viewer",
    required: true,
  },
  givenFor: {
    type: String,
    // enum: [
    //   "audioCall-booking",
    //   "audioCall-completion",
    //   "videoCall-booking",
    //   "videoCall-completion",
    //   "on-stream-coins",
    //   "on-call-coins",
    //   "on-stream-activity",
    //   "on-call-activity",
    //   "viewer-refund" /* done by system/admin */,
    //   "system-admin" /* system or admin */,
    // ],
  },
})

const TokenGiftHistory = new mongoose.model(
  "TokenGiftHistory",
  tokenGiftHistorySchema
)

module.exports = TokenGiftHistory
