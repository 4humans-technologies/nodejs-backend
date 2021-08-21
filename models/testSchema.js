const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true
    },
    number: {
        type: Number,
        min: 10,
        max: 20,
        default: 15,
    },
    meta: {
        type: Map,
        of: String
    },
    permission: [
        {
            type: String,
            validate: v => {
                // validate the value and return true or false
            },
            get: v => v,
            set: v => v,
        }
    ]
})