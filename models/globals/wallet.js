const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
    rootUser:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        unique:true,
        index:true
    },
    userType: {
        type: String,
        required:true,
        enum:["Viewer","Model"]
    },
    relatedUser:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        refPath:"userType"
    },
    currentAmount:{
        type:Number,
        required:true
    }
})