const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
        // unique: true,
        // index:true
    },
    permissions:{
        type:[String],
        required:true
    },
    role:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref:"Role"
    },
    password: {
        type: String,
        required: true
    },
    userType: {
        type: String,
        required:true,
        enum:["Viewer","Model","Superadmin","Staff"]
    },
    relatedUser:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        refPath:"userType"
    },
    meta:{
        type:Map,
        required:true,
        default:{
            created:new Date().getTime(),
            lastLogin:null,
            lastUpdated:null
        }
    }
})

userSchema.pre("save", function(next) {
    const password = this.password
    // this.userpassword = bcrypt.hashSync(password,12)
    bcrypt.hash(password,5).then(hashedPassword => {
        this.password = hashedPassword
        console.log("before saving");
        next();
    })
})

userSchema.post("save", function(doc){
    // do stuff
    console.log("After saving");
})

const User = new mongoose.model("User",userSchema)

module.exports = User