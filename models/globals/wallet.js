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
    set: (amt) => {
      if (!Number.isInteger(amt)) {
        return parseFloat(amt.toFixed(1))
      }
      return amt
    },
  },
  lastTransaction: {
    type: Map,
    required: true,
    default: {
      amount: undefined,
      time: undefined,
    },
  },
})

walletSchema.methods.deductAmount = function (amount, buffer = 0) {
  if (this.currentAmount >= amount) {
    return (this.currentAmount = this.currentAmount - amount)
  } else {
    /**
     * check if only some amount is less
     */
    if (this.currentAmount + buffer >= amount) {
      return (this.currentAmount = 0)
    }
  }
  const error = new Error(
    "don't have sufficient balance to perform this Purchase"
  )
  error.statusCode = 401
  throw error
}

walletSchema.methods.addAmount = function (amount) {
  this.currentAmount = this.currentAmount + parseFloat(amount.toFixed(1))
}
walletSchema.methods.setAmount = function (amount) {
  this.currentAmount = amount
}

const Wallet = mongoose.model("Wallet", walletSchema)

module.exports = Wallet
