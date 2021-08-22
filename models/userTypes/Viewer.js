const mongoose = require("mongoose");

const viewerSchema = new mongoose.Schema({
    rootUser: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        ref: "User"
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true,
        unique: true
    },
    gender:{
        type:String,
        required:true,
        enum:["Male","Female","Custom"]
    },
    profileImages: {
        type: String,
        required: true
    },
    hobbies: {
        type: [String],
        required: true
    },
    wallet:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"Wallet",
        unique:true,
        index:true,
    },
    following:[{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Model"
    }],
    streams:[{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Streams"
    }],
    purchaseHistory:[{
        type:mongoose.Schema.Types.ObjectId,
        ref: "coinPurchase"
    }],
    giftHistory:[{
        type:mongoose.Schema.Types.ObjectId,
        ref: "giftPurchase"
    }],
    videoCallHistory:[{
        type:mongoose.Schema.Types.ObjectId,
        ref: "videoCall"
    }],
    audioCallHistory:[{
        type:mongoose.Schema.Types.ObjectId,
        ref: "audioCall"
    }]
})

const Viewer = new mongoose.model("Viewer",viewerSchema)

module.exports = Viewer