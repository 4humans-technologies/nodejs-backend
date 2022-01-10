const mongoose = require("mongoose")
const { nanoid } = require("nanoid")

const couponSchema = new mongoose.Schema(
  {
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    code: {
      type: String,
      required: true,
      default: () => nanoid(64),
      index: true,
      unique: true,
    },
    forCoins: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value, point is not allowed",
      },
    },
    redeemed: {
      type: Boolean,
      default: false,
    },
    redeemedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    redeemDate: {
      type: Date,
    },
  },
  { timestamps: true }
)

const Coupon = mongoose.model("Coupon", couponSchema)

module.exports = Coupon
