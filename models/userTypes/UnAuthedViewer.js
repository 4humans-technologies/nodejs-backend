const mongoose = require("mongoose");


const unAuthedViewerSchema = new mongoose.Schema({
    sessions:{
        type:Number,
        required:true,
        default:1
    },
    streamViewed:{
        type:Number,
        required:true,
        default:0,
    },
    timeSpent:{
        type:Number,
        required:true,
        default:1
    },
    lastAccess:{
        type:Date,
        default: new Date().toISOString()
    }
},{timestamps:true})

const UnAuthedViewer = mongoose.model("UnAuthedViewer", unAuthedViewerSchema)

module.exports = UnAuthedViewer