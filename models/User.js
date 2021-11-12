const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Permission = require("./Permission")

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        index:true
    },
    password: {
        type: String,
        required: true
    },
    permissions: {
        type: [String],
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
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
    needApproval: {
        type: Boolean,
        required: true,
        default: true
    },
    meta: {
        type: Map,
        required: true,
        default: {
            lastLogin: null,
        }
    }
}, { timestamps: true })

userSchema.methods.updateLastLogin = function () {
    // could have used this.updateOne({"meta.lastLogin":new Date()})
    this.meta.set("lastLogin", new Date())
    this.save()
}


// userSchema.post("save", function(doc){
//     // do stuff
//     console.log("After saving user");
// })

const User = mongoose.model("User", userSchema)

module.exports = User