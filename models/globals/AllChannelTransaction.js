const mongoose = require("mongoose")

const coinPurchaseSchema = new mongoose.Schema({
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Model",
    required: true,
  },
  king: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Viewer",
    },
    spent: Number,
    from: {
      type: Date,
    },
  },
  transaction: [
    {
      viewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Viewer",
      },
      spent: {
        type: Number,
        required: true,
      },
    },
  ],
})

const CoinPurchase = mongoose.model("CoinPurchase", coinPurchaseSchema)
module.exports = CoinPurchase
