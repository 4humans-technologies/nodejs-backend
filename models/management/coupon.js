const mongoose = require("mongoose")
const { nanoid } = require("nanoid")

const couponSchema = new mongoose.Schema(
  {
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    code: {
      type: String,
      required: true,
      default: () => nanoid(64),
      unique: true,
      index: true,
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
      index: true,
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
