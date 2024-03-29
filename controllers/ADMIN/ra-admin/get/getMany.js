// root
const Role = require("../../../../models/Role")
const Permission = require("../../../../models/Permission")

// userTypes
const Model = require("../../../../models/userTypes/Model")
const Viewer = require("../../../../models/userTypes/Viewer")
const Staff = require("../../../../models/userTypes/Staff")

// management
const Approval = require("../../../../models/management/approval")
const Tag = require("../../../../models/management/tag")
const PriceRange = require("../../../../models/management/priceRanges")
const Coupon = require("../../../../models/management/coupon")
const PrivateChatPlan = require("../../../../models/management/privateChatPlan")

// globals
const AudioCall = require("../../../../models/globals/audioCall")
const VideoCall = require("../../../../models/globals/videoCall")
const CoinSpendHistory = require("../../../../models/globals/coinsSpendHistory")
const CoinPurchase = require("../../../../models/globals/coinPurchase")
const ImageAlbum = require("../../../../models/globals/ImageAlbum")
const VideoAlbum = require("../../../../models/globals/VideosAlbum")
const Stream = require("../../../../models/globals/Stream")
const ModelDocuments = require("../../../../models/globals/modelDocuments")

// log
const Log = require("../../../../models/log/log")

module.exports = (req, res, next) => {
  /**
   * get the single document from db
   * based on :id,
   */
  const { resource } = req.params

  const filter = JSON.parse(req.query.filter)
  const ids = filter?.ids || filter.id

  var model, select, populate, findQry
  switch (resource) {
    case "Model":
      model = Model
      populate = [
        {
          path: "rootUser",
          select: "username",
        },
      ]
      break
    case "Viewer":
      model = Viewer
      populate = [
        {
          path: "wallet",
          select: "currentAmount",
        },
        {
          path: "rootUser",
          select: "username lasLogin",
        },
        {
          path: "currentChatPlan",
          select: "name validityDays price",
        },
      ]
      break
    case "Stream":
      model = Stream
      break
    case "AudioCall":
      model = AudioCall
      break
    case "VideoCall":
      model = VideoCall
      break
    case "CoinSpendHistory":
      model = CoinSpendHistory
      break
    case "ModelDocuments":
      model = ModelDocuments
      break
    case "CoinPurchase":
      model = CoinPurchase
      break
    case "Tag":
      findQry = {
        name: ids,
      }
      model = Tag
      break
    case "Approval":
      model = Approval
      break
    case "Permission":
      model = Permission
      select = "value verbose"
      break
    case "Staff":
      model = Staff
      break
    case "Role":
      model = Role
      break
    case "Log":
      model = Log
      break
    case "Coupon":
      model = Coupon
      break
    case "PriceRange":
      model = PriceRange
      break
    case "ImageAlbum":
      model = ImageAlbum
      break
    case "VideoAlbum":
      model = VideoAlbum
      break
    case "PrivateChatPlan":
      model = PrivateChatPlan
      break
    default:
      /**
       * throw error invalid resource requested
       */
      break
  }

  model
    .find(
      findQry || {
        _id: { $in: ids },
      }
    )
    .select(select)
    .populate(populate)
    .lean()
    .then((records) => {
      if (records) {
        return res.status(200).json(records)
      } else {
        const error = new Error(
          `The requested ${resource} was not found, Invalid Id`
        )
        error.statusCode = 422
        throw error
      }
    })
    .catch((err) => next(err))
}
