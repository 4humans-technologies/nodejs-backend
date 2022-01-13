const mongoose = require("mongoose")

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength:32
    },
  },
  { timestamps: true }
)

const Tag = mongoose.model("Tag", tagSchema)

module.exports = Tag
