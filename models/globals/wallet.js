const mongoose = require("mongoose")

const walletSchema = new mongoose.Schema({
  rootUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userType: {
    type: String,
    required: true,
    enum: ["Viewer", "Model", "SuperAdmin"],
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: "userType",
    unique: true,
  },
  currentAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  lastTransaction: {
    type: Map,
    required: true,
    default: {
      amount: null,
      time: null,
    },
  },
})

walletSchema.methods.deductAmount = function (amount) {
  if (this.currentAmount >= amount) {
    return (this.currentAmount = this.currentAmount - amount)
  }
  const error = new Error(
    "don't have sufficient balance to perform this Purchase"
  )
  error.statusCode = 401
  throw error
}

walletSchema.methods.addAmount = function (amount) {
  this.currentAmount = this.currentAmount + amount
}

const Wallet = mongoose.model("Wallet", walletSchema)

module.exports = Wallet
