const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Permission = require("./Permission")

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
        // unique: true,
        // index:true
    },
    password: {
        type: String,
        required: true
    },
    permissions: {
        type: [String],
        required: true
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Role"
    },
    userType: {
        type: String,
        required: true,
        enum: ["Viewer", "Model", "SuperAdmin", "Staff"]
    },
    relatedUser: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "userType"
    },
    needApproval:{
        type:Boolean,
        required:true,
        default:true
    },
    meta: {
        type: Map,
        required: true,
        default: {
            lastLogin: null,
        }
    }
}, {
    timestamps: true
})

userSchema.methods.updateLastLogin = function () {
    // could have used this.updateOne({"meta.lastLogin":new Date().toISOString()})
    this.meta.set("lastLogin", new Date().toISOString())
    this.save()
}


// userSchema.post("save", function(doc){
//     // do stuff
//     console.log("After saving user");
// })

const User = mongoose.model("User", userSchema)

module.exports = User