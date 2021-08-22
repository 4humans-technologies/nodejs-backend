const mongoose = require("mongoose");

const modelSchema = new mongoose.Schema({
    rootUser: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        ref: "User"
    },
    name: {
        type: String,
        required: true
    },
    screenName: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 24,
        // add validation here
    },
    gender:{
        type:String,
        required:true,
        enum:["Male","Female","Custom"]
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
    bio: {
        type: String,
        required: true,
        minlength: 20,
        maxlength: 512
    },
    hobbies: {
        type: [String],
        required: true
    },
    adminPriceRange: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "priceRange"
    },
    charges: {
        type: Number,
        required: true,
        validate: val => v
    },
    rating:{
        type:Number,
        min:0,
        max:5,
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    isStreaming: {
        type: Boolean,
        default: false
    },
    currentStream: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Stream"
    },
    profileImages: {
        type: String,
        required: true
    },
    publicImages: {
        type: [String],
        required: true
    },
    privateImages: {
        type: Map,
        of: new mongoose.Schema({
            images: {
                type: [String],
                required: true
            },
            price: {
                type: Number,
                required: true
            }
        })
    },
    streams:[{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Streams"
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

const Model = new mongoose.model("Model",modelSchema)

module.exports = Model