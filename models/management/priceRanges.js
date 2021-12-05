const mongoose = require("mongoose")

const priceRangeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    minCharges: {
      audioCall: {
        type: Number,
        default: 10,
      },
      videoCall: {
        type: Number,
        default: 30,
      },
      activity: {
        default: null /* no limit imposition */,
      },
    },
    maxCharges: {
      audioCall: {
        type: Number,
        default: 30,
      },
      videoCall: {
        type: Number,
        default: 90,
      },
      activity: {
        default: null, /* no limit imposition */,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
)

const PriceRange = mongoose.model("PriceRange", priceRangeSchema)

module.exports = PriceRange
