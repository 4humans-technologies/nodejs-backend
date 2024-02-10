const mongoose = require("mongoose")
/**
 * (-1) implies no limit
 */

const priceRangeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    minCharges: {
      audioCall: {
        type: Number,
        default: 10,
      },
      videoCall: {
        type: Number,
        default: 30,
      },
      activity: {
        type: Number,
        default: -1 /* no limit imposition */,
      },
      perImage: {
        type: Number,
        default: -1 /* min price for an image in an album */,
      },
      perVideo: {
        type: Number,
        default: -1 /* min price for a video in an album */,
      },
      numberOfImages: {
        type: Number,
        default: -1 /* min number of image in an video */,
      },
      numberOfVideos: {
        type: Number,
        default: -1 /* min number of videos in an video */,
      },
    },
    maxCharges: {
      audioCall: {
        type: Number /* max  ==>> "MIN CALL DURATION" for a call */,
        default: 30,
      },
      videoCall: {
        type: Number /* max ==>> "MIN CALL DURATION" for a call */,
        default: 90,
      },
      activity: {
        type: Number,
        default: -1 /* no limit imposition */,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  { timestamps: true }
)

const PriceRange = mongoose.model("PriceRange", priceRangeSchema)

module.exports = PriceRange
