const mongoose = require("mongoose")

const tokenGiftHistorySchema = new mongoose.Schema({
  time: {
    type: Date,
    default: new Date().toISOString(),
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
})

const TokenGiftHistory = new mongoose.model(
  "TokenGiftHistory",
  tokenGiftHistorySchema
)

module.exports = TokenGiftHistory
