const mongoose = require("mongoose")

const privateChatPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    validityDays: {
      type: Number,
      required: true /* will store number in hours */,
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "active",
      enum: ["active", "discouraged", "deactivated"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
)

const PrivateChatPlan = new mongoose.model(
  "PrivateChatPlan",
  privateChatPlanSchema
)

module.exports = PrivateChatPlan
