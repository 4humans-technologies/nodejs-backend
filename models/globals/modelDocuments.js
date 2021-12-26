const mongoose = require("mongoose")

const documentSchema = new mongoose.Schema(
  {
    model: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Model",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    images: {
      type: [String],
      required: true,
    },
  },
  { timestamps: true }
)

const Document = mongoose.model("Document", documentSchema)

module.exports = Document
