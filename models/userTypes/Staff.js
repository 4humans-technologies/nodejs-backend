const mongoose = require("mongoose")

const staffSchema = new mongoose.Schema(
  {
    rootUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    remark: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
)

const Staff = mongoose.model("Staff", staffSchema)

module.exports = Staff
