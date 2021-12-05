const mongoose = require("mongoose")

const imageAlbumSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  originalImages: {
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

const ImageAlbum = mongoose.model("ImageAlbum", imageAlbumSchema)

module.exports = ImageAlbum
