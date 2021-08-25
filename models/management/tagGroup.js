const mongoose = require("mongoose")

const tagGroupSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true
    },
    tags:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Tag"
    }]
},{timestamps:true})

const TagGroup = mongoose.model("TagGroup",tagGroupSchema)

module.exports = TagGroup