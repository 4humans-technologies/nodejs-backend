const mongoose = require("mongoose")

const coinsSendHistorySchema = new mongoose.Schema({
  time: {
    type: Date,
    default: Date,
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
    type: Number,
    enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  },
})

const CoinsSpendHistory = mongoose.model(
  "CoinsSpendHistory",
  coinsSendHistorySchema
)

module.exports = CoinsSpendHistory
