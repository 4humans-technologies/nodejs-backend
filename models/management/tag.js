const mongoose = require("mongoose")

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
)

const Tag = mongoose.model("Tag", tagSchema)

module.exports = Tag
