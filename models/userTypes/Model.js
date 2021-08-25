const mongoose = require("mongoose");

const modelSchema = new mongoose.Schema({
    rootUser: {
        type: mongoose.Schema.Types.ObjectId,
        // required: true,
        unique: true,
        ref: "User"
    },
    approval: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Approval",
        required:true,
        default:null
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
        unique: true
        // add validation here
    },
    gender: {
        type: String,
        required: true,
        enum: ["Male", "Female", "Custom"]
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
    dob:{
        type:Date,
        required:true
    },
    bio: {
        type: String,
        minlength: 20,
        maxlength: 512
    },
    hobbies: {
        type: [String],
    },
    adminPriceRange: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "PriceRange"
    },
    charges: {
        type: Number,
        required: true,
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
    },
    isOnline: {
        type: Boolean,
        default: false,
        index:true
    },
    isStreaming: {
        type: Boolean,
        default: false,
        index:true
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
    streams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Streams"
    }],
    videoCallHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "videoCall"
    }],
    audioCallHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "audioCall"
    }]
})

const Model = mongoose.model("Model", modelSchema)

module.exports = Model