const mongoose = require("mongoose")

const permissionSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
)

const Permission = mongoose.model("Permission", permissionSchema)

module.exports = Permission
