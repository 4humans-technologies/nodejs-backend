const mongoose = require("mongoose");

const coinPurchaseSchema = new mongoose.Schema({
    timestamp:{
        type:Number,
        default:new Date().getTime()
    },
    by:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    },
    amount:{
        type:Number,
        required:true
    },
    coins:{
        type:Number,
        required:true
    }
})

const CoinPurchase = new mongoose.model("CoinPurchase",coinPurchaseSchema)