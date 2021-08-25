const mongoose = require("mongoose")

const superAdminSchema = new mongoose.Schema({
    rootUser: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
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
        enum:["Male","Female"]
    }
})

const SuperAdmin = mongoose.model("SuperAdmin",superAdminSchema)

module.exports = SuperAdmin