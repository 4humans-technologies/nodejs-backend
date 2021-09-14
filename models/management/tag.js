const mongoose = require("mongoose")

const tagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: String,
    modelCount: {
        type: Number,
        default: 0
    },
}, { timestamps: true })

const Tag = mongoose.model("Tag", tagSchema)

module.exports = Tag