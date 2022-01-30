const mongoose = require("mongoose")

const permissionSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
    },
    verbose: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

const Permission = mongoose.model("Permission", permissionSchema)

module.exports = Permission
