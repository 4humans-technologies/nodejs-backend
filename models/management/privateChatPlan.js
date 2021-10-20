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
