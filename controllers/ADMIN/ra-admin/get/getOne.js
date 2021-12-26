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
const PriceRange = require("../../../../management/priceRanges")
const Coupon = require("../../../../management/coupon")
const Approval = require("../../../../management/Approval")
const PrivateChatPlan = require("../../../../management/privateChatPlan")

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

const createModel = require("./createModel")
const createViewer = require("./createViewer")

module.exports = (req, res, next) => {
  /**
   * get the single document from db
   * based on :id,
   */
  const { resource, id } = req.params

  var model, select, populate
  switch (resource) {
    case "Model":
      model = Model
      select = ""
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
          path: "approval",
          select: "-forModel",
          populate: [
            {
              path: "by",
              select: "username role",
            },
          ],
        },
        {
          path: "adminPriceRange",
        },
        {
          path: "documents",
        },
      ]
      break
    case "Viewer":
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
        {
          path: "privateImagesPlans",
          select: "name thumbnails price",
        },
        {
          path: "privateVideosPlans",
          select: "name thumbnails price",
        },
      ]
      model = Viewer
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
      model = Tag
      break
    case "Approval":
      model = Approval
      break
    case "Permission":
      model = Permission
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
      break
  }

  model
    .select(select)
    .populate(populate)
    .lean()
    .findById(id)
    .then((record) => {
      if (record) {
        return res.status(200).json(record)
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
