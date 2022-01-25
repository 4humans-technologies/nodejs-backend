const mongoose = require("mongoose")

const logSchema = new mongoose.Schema({
  ts: {
    type: Date,
    default: Date,
  },
  msg: {
    type: String,
    required: true,
  },
  by: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  username: String,
})

const Log = mongoose.model("Log", logSchema)

module.exports = Log
