// root
const Role = require("../../../../models/Role")
const Permission = require("../../../../models/Permission")
const User = require("../../../../models/User")
const ModelViewerPrivateChat = require("../../../../models/ModelViewerPrivateChat")

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
const AudioCall = require("../../../../models/globals/wallet")
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
   * delete the single document from db
   * based on : "id" only, no other field supported
   * ============
   * Also have to delete all the related resource to that (CASCADE DELETE)
   */
  const { resource, id } = req.params

  var model
  switch (resource) {
    case "Model":
      /**
       * cascade delete: rootUser,wallet,approval,document,public Albums,?privateChats, ?privateAlbums
       * delete for other entries:remove from viewers followingList,
       */
      Model.findById(id)
        .select("rootUser wallet approval documents privateChats")
        .lean()
        .then((model) => {
          /**
           * Complete delete of model will happen by custom script or from
           * database
           */

          /**
           * model is not being deleted because i have to figure out how to
           * handle it's remaining reference in tokenhistories,chats,albums,calls,streams etc
           */
          Promise.all([
            User.updateOne(
              {
                _id: model.rootUser._id,
              },
              {
                needApproval: true,
              }
            ),
            Wallet.deleteOne({
              _id: model.wallet._id,
            }),
            Approval.deleteOne({
              _id: model.approval._id,
            }),
            ModelDocuments.deleteOne({
              _id: model.document._id,
            }),
            Model.findOneAndUpdate(
              {
                _id: id,
              },
              {
                $unset: {
                  approval: 1,
                  documents: 1,
                  followers: 1,
                  numberOfFollowers: 1,
                  tipMenuActions: 1,
                  sharePercent: 1,
                  charges: 1,
                  minCallDuration: 1,
                  publicImages: 1,
                  publicVideos: 1,
                  privateImages: 1,
                  privateVideos: 1,
                  videoCallHistory: 1,
                  audioCallHistory: 1,
                  wallet: 1,
                  privateChats: 1,
                },
              }
            ).populate("rootuser"),
          ])
            .then(() => {
              /* ====== */
            })
            .catch((err) => next(err))
        })
        .catch((err) => next(err))
      model = Model
      break
    case "Viewer":
      /**
       * cascade delete: rooUser,wallet
       * delete from other entries: models following list and dec count
       */
      Viewer.findById(id)
        .select("rootUser wallet privateChats following")
        .lean()
        .then((viewer) => {
          return Promise.all([
            Model.updateOne(
              {
                id: { $in: viewer.following },
              },
              {
                $pull: { followers: id },
                $inc: { numberOfFollowers: -1 },
              }
            ),
            User.deleteOne({
              _id: viewer._id,
            }),
            Wallet.deleteOne({
              _id: viewer.wallet._id,
            }),
            ModelViewerPrivateChat.deleteOne({
              _id: viewer.privateChats._id,
            }),
          ])
        })
      model = Viewer
      break
    case "Stream":
      /**
       * cannot delete for now
       */
      model = Stream
      break
    case "AudioCall":
      /**
       * cascade delete:
       * delete from other entries:
       */
      model = AudioCall
      break
    case "VideoCall":
      /**
       * cascade delete:
       * delete from other entries:
       */
      model = VideoCall
      break
    case "CoinSpendHistory":
      /**
       * should not be deleteable initially
       */
      model = CoinSpendHistory
      break
    case "ModelDocuments":
      /**
       * should not be able to delete directly, should
       * be delete by system when model delete occurs, not sure have to think more ???
       */
      model = ModelDocuments
      break
    case "CoinPurchase":
      /**
       * cannot be deleted
       */
      model = CoinPurchase
      break
    case "Tag":
      /**
       * cascade delete: nothing
       * delete from other entries: remove from model
       */
      model = Tag
      break
    case "Approval":
      /**
       * no direct delete, will be delete when model delete occurs
       */
      model = Approval
      break
    case "Permission":
      /**
       * cannot be deleted
       */
      model = Permission
      break
    case "Staff":
      /**
       * cascade delete: user,
       * delete from other entries:
       */
      model = Staff
      break
    case "Role":
      /**
       * if deleted what about his entries, like approval,role,plans tags etc
       */
      model = Role
      break
    case "Log":
      /**cannot be deleted
       */
      model = Log
      break
    case "Coupon":
      /**
       * cascade delete: nothing
       * delete from other entries:nothing
       */
      model = Coupon
      break
    case "PriceRange":
      /**
       * check before delete that this priceRange should not be already
       * currently alloted to any model
       */
      model = PriceRange
      break
    case "ImageAlbum":
      /**
       * HAVE THINK ABOUT IT ????
       */
      model = ImageAlbum
      break
    case "VideoAlbum":
      /**
       * HAVE THINK ABOUT IT ????
       */
      model = VideoAlbum
      break
    case "PrivateChatPlan":
      /**
       * can not be deleted if someone have this as active plan
       * flag this plan as "inactive" and wait for expiry of plans
       * after time delete it
       */
      model = PrivateChatPlan
      break
    default:
      /**
       * throw error invalid resource requested
       */
      break
  }

  model
    .findOneAndDelete({
      _id: id,
    })
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
