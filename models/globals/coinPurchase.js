const mongoose = require("mongoose")

const coinPurchaseSchema = new mongoose.Schema({
  timestamp: {
    type: Number,
    default: Date,
  },
  by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  amount: {
    type: Number,
    required: true,
  },
  coins: {
    type: Number,
    required: true,
  },
})

const CoinPurchase = mongoose.model("CoinPurchase", coinPurchaseSchema)
module.exports = CoinPurchase
