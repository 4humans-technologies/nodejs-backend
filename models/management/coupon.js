const mongoose = require("mongoose")
const { nanoid } = require("nanoid")

const couponSchema = new mongoose.Schema(
  {
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Staff",
    },
    acknowledged: {
      /* was it acknowledged by it's creator */
      type: Boolean,
      default: true,
    },
    code: {
      type: String,
      required: true,
      default: () => nanoid(32),
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
      ref: "Viewer",
    },
    redeemDate: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true }
)

const Coupon = mongoose.model("Coupon", couponSchema)

module.exports = Coupon
