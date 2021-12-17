const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema({
  _id: false,
  time: {
    type: Date,
    default: Date,
  },
  message: {
    type: String,
    required: true,
  },
  tag: String,
  data: String,
})

const notificationHolderSchema = new mongoose.Schema(
  {
    relatedUser: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "userType",
      unique: true,
    },
    notifications: [notificationSchema],
  },
  {
    timestamps: {
      createdAt: false,
      currentTime: false,
      updatedAt: true,
    },
  }
)

const NotificationHolder = mongoose.model(
  "Notification",
  notificationHolderSchema
)

module.exports = NotificationHolder
