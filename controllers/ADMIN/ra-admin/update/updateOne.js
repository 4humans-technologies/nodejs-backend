// root
const Role = require("../../../../models/Role")
const Permission = require("../../../../models/Permission")

// userTypes
const User = require("../../../../models/User")
const Model = require("../../../../models/userTypes/Model")
const Viewer = require("../../../../models/userTypes/Viewer")
const Staff = require("../../../../models/userTypes/Staff")

// management
const Approval = require("../../../../models/management/approval")
const Tag = require("../../../../models/management/tag")
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
const Wallet = require("../../../../models/globals/wallet")

// log
const Log = require("../../../../models/log/log")

const updateProcessors = require("./updateProcessors")

module.exports = (req, res, next) => {
  /**
   * get the single document from db
   * based on :id,
   */

  /**
   * server must send either 200 or 204 (no content)
   */
  const { resource, id } = req.params

  var processorFunc, model, processorOptions
  switch (resource) {
    case "UnApprovedModel":
      model = Model
      processorFunc = updateProcessors.updateUnApprovedModel
      processorOptions = {
        requiredModels: {
          User: User,
          Approval: Approval,
        },
      }
      break
    case "Model":
      /**
       * do a special check if the sharePercent is being changed
       * if it's being changed then it should be in the "priceRange"
       */
      processorFunc = updateProcessors.updateModel
      processorOptions = {
        requiredModels: {
          User: User,
          Wallet: Wallet,
        },
      }
      model = Model
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
      processorFunc = updateProcessors.updateTag
      processorOptions = {
        requiredModels: {
          Model: Model,
        },
      }
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
      /**
       * update coupon permission is a very crucial property
       * and should distrupt things
       */

      /**
       * can only update forCoins, redeemed,redeemDate,redeemedBy
       */

      model = Coupon
      Coupon.findOneAndUpdate(body)
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
      processorFunc = () => {}
      processorOptions = {
        requiredModels: {
          Viewer: Viewer,
        },
      }
      break
    default:
      break
  }
  if (!processorFunc) {
    return res.status(400).json({
      message: "for now the server not set-up for this action",
    })
  }
  return processorFunc(model, req, res, { _id: id, ...processorOptions }).catch(
    (err) => next(err)
  )
}
