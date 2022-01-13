const mongoose = require("mongoose")
const validator = require("validator")

const roleSchema = new mongoose.Schema(
  {
    permissions: {
      type: [String],
      required: true,
    },
    permissionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      required: true,
    },
    roleName: {
      type: String,
      unique: true,
      index: true,
      required: true,
      validate: {
        validator: (v) => {
          return validator.isAlphanumeric(v)
        },
        message:
          "Role name should not contain special characters or spaces!, only letters and numbers are allowed",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
)

const Role = mongoose.model("Role", roleSchema)

module.exports = Role
