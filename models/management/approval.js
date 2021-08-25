const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema({
    for:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Model"
    },
    roleDuringApproval:{
        type:String,
        required:true
    },
    by: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    },
    remark: String,
    approvalTime: Date
})

const Approval = mongoose.model("Approval",approvalSchema)

module.exports = Approval
