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

  /**
   * FOR ALL GET ONE METHOD POPULATE IS PREFFERABLE, 💰💰
   */

  const { resource, id } = req.params

  var model, select, populate, getWith
  switch (resource) {
    case "UnApprovedModel":
      getWith = "normal"
      model = Model
      select = "name profileImage email phone gender"
      populate = [
        {
          path: "rootUser",
        },
        {
          path: "documents",
        },
      ]
      break
    case "Model":
      getWith = "normal"
      model = Model
      populate = [
        {
          path: "wallet",
          select: "currentAmount",
        },
        {
          path: "rootUser",
          select: "username lasLogin needApproval",
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
          path: "documents",
        },
      ]
      break
    case "Viewer":
      getWith = "normal"
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
      getWith = "normal"
      model = Stream
      break
    case "AudioCall":
      getWith = "normal"
      model = AudioCall
      break
    case "VideoCall":
      getWith = "normal"
      model = VideoCall
      break
    case "CoinSpendHistory":
      getWith = "normal"
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
      select = "name createdAt updatedAt"
      populate = []
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
      select = ""
      populate = [
        {
          path: "generatedBy",
          select: "username -_id",
        },
        {
          path: "redeemedBy",
          select: "username -_id",
        },
      ]
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
      select = "name description validityDays price status createdBy createdAt"
      populate = [
        {
          path: "createdBy",
          select: "username",
        },
      ]
      break
    default:
      /**
       * throw error invalid resource requested
       */
      break
  }

  model
    .findById(id)
    .select(select)
    .populate(populate)
    .lean()
    .then((record) => {
      if (record) {
        return res.status(200).json({
          id: record._id,
          ...record,
        })
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
