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
          return /^[a-zA-Z0-9_]+$/.test(v)
        },
        message:
          "Role name should contain only letters (A to Z), numbers(0 to 9) and _",
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
