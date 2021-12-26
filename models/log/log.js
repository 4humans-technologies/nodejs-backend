const mongoose = require("mongoose")

const logSchema = new mongoose.Schema({
  timestamp: {
    type: Number,
    default: Date,
  },
  action: {
    type: String,
    required: true,
  },
  by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
})

const Log = mongoose.model("Log", logSchema)

module.exports = Log
