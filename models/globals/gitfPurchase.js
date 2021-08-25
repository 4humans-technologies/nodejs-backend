const mongoose = require("mongoose");

const giftPurchaseSchema = new mongoose.Schema({
    time:{
        type:Date,
        default: new Date().toISOString()
    },
    gifts:[
        {
            gift:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"Gift"
            },
            quantity:{
                type:Number,
                required:true
            }
        }
    ],
    forModel:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Model",
        default:null
    }
})