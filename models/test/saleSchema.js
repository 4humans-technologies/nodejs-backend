const mongoose = require("mongoose")

const saleSchema = new mongoose.Schema({
    saleDate: Date,
    items: [{
        name: String,
        tags: [String],
        price: Number,
        quantity: Number
    }],
    storeLocation: String,
    couponUsed: Boolean,
    purchaseMethod: {
        type: String,
        enum: ["Online", "In store", "Phone"]
    },
    customer: {
        age: Number,
        email: String,
        gender: {
            type: String,
            enum: ["M", "F"]
        },
        satisfaction: Number
    }
})

const Sale = mongoose.model("Sale", saleSchema)
module.exports = Sale