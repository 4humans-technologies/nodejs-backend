const mongoose = require("mongoose")

const unAuthedViewerSchema = new mongoose.Schema({
  sessions: {
    /**
     * number of times he visited the site
     */
    type: Number,
    required: true,
    default: 1,
  },
  streamViewed: {
    type: Number,
    required: true,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date,
  },
  lastAccess: {
    type: Date,
    default: Date,
  },
  lastStream: {
    /**
     * for tracking on which model the conversion happened
     */
    type: mongoose.Schema.Types.ObjectId,
    ref: "Stream",
  },
})

const UnAuthedViewer = mongoose.model("UnAuthedViewer", unAuthedViewerSchema)

module.exports = UnAuthedViewer
