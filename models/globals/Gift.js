const mongoose = require("mongoose");

const giftSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    created:{
        type:Date,
        default:new Date().getTime()
    },
    priceInCoins:{
        type:Number,
        required:true
    },
    priceInRupee:{
        type:Number,
        required:true
    }
    // packages and bundles

})