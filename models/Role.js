const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
    permissions: {
        type: [String],
        required: true,
    },
    roleName: {
        type: String,
        unique: true,
        index: true,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: "User",
    }
}, {
    timestamps: true
})

const Role = mongoose.model("Role", roleSchema)

module.exports = Role