const mongoose = require("mongoose");

const priceRangeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        minlength: 24,
        maxlength: 512
    },
    minCharges: {
        type: Number,
        required: true
    },
    maxCharges: {
        type: Number,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User"
    }
}, { timestamps: true })

const PriceRange = mongoose.model("PriceRange",priceRangeSchema)

module.exports = PriceRange