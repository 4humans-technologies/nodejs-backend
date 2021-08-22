const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
    timestamp:{
        type:Number,
        default:new Date().getTime()
    },
    action:{
        type:String,
        required:true
    },
    by:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"User"
    }
})
