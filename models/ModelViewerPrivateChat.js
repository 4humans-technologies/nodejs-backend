const mongoose = require("mongoose")

const modelViewerPrivateChatSchema = new mongoose.Schema({
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Viewer",
    required: true,
    index: true,
  },
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Model",
    index: true,
    required: true,
  },
  quickFindIndex: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  chats: {
    type: [
      {
        _id: false,
        by: {
          type: String,
          enum: ["Model", "Viewer"],
        },
        ts: {
          type: Number,
        },
        msg: {
          type: String,
          maxlength: 512,
        },
      },
    ],
    default: [],
  },
  createdAt: {
    type: Date,
    default: new Date().toISOString(),
  },
})

const ModelViewerPrivateChat = mongoose.model(
  "ModelViewerPrivateChat",
  modelViewerPrivateChatSchema
)

module.exports = ModelViewerPrivateChat
