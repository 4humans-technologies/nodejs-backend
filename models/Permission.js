const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema({
    value:{
        type:String,
        required:true
    },
    code:{
        type:String,
        unique:true,
        required:true
    },
},{
    timestamps:true
})

const Permission = new mongoose.model("Permission",permissionSchema)

module.exports = Permission