const mongoose = require("mongoose")

const videoAlbumSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  originalVideos: {
    type: [String],
    default: [],
  },
  thumbnails: {
    type: [String],
    default: [],
  },
  price: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date,
  },
  purchases: {
    type: Number,
    default: 0,
  },
})

const VideoAlbum = mongoose.model("VideoAlbum", videoAlbumSchema)

module.exports = VideoAlbum
