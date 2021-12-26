const mongoose = require("mongoose")

const approvalSchema = new mongoose.Schema({
  forModel: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  roleDuringApproval: {
    type: String,
    required: true,
  },
  by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  remarks: String,
  approvalTime: {
    type: Date,
    default: Date,
  },
})

const Approval = mongoose.model("Approval", approvalSchema)

module.exports = Approval
