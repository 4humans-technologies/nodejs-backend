const mongoose = require("mongoose")
const { nanoid } = require("nanoid")

const passwordResetTokenSchema = new mongoose.Schema({
  uidToken: {
    type: String,
    required: true,
    default: () => nanoid(64),
    index: true,
    unique: true,
  },
  forUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Viewer",
  },
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Viewer",
  },
  createdAt: {
    type: Number,
    default: () => Date.now(),
  },
})

const PasswordResetToken = mongoose.model(
  "PasswordResetToken",
  passwordResetTokenSchema
)

module.exports = PasswordResetToken
