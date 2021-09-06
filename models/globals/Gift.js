const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    packages: [{
        giftCount: Number,
        price: Number
    }]
    // packages and bundles

}, { timestamps: true })

const Gift = mongoose.model("Gift", giftSchema)

module.exports = Gift