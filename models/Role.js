const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
    permissions:{
        type:[String],
        required:true,
    },
    roleName:{
        type:String,
        required:true
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    },
    createdOn:{
        type:Date,
        default:new Date().getTime()
    }
})

const Role = mongoose.Model("Role",roleSchema)

module.exports = Role