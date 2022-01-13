// root
const { deleteImages } = require("../../../../utils/aws/s3")
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
const Wallet = require("../../../../models/globals/wallet")
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

  var deleteQuery
  switch (resource) {
    case "Model":
      /**
       * cascade delete: rootUser,wallet,approval,document,public Albums,?privateChats, ?privateAlbums
       * delete for other entries:remove from viewers followingList,
       */
      var objectsToDelete = []
      deleteQuery = Promise.all([
        Model.findById(id)
          .select(
            "rootUser wallet approval documents privateChats profileImage publicImages publicVideos coverImage backGroundImage"
          )
          .lean(),
        ModelDocuments.deleteOne({
          _id: model.document._id,
        }).lean(),
      ])
        .then(([model, documents]) => {
          objectsToDelete.push(model.profileImage)
          objectsToDelete.push(model.coverImage)
          objectsToDelete.push(model.backGroundImage)
          model.publicImages.forEach((image) => {
            objectsToDelete.push(image)
          })
          model.publicVideos.forEach((image) => {
            objectsToDelete.push(image)
          })
          documents.images.forEach((image) => {
            objectsToDelete.push(image)
          })

          /**
           * Complete delete of model will happen by custom script or from
           * database
           */

          /**
           * how to
           * handle it's remaining reference in tokenhistories,chats,albums,calls,streams etc
           */

          return Promise.all([
            User.findOneAndDelete({
              _id: model.rootUser._id,
            }).lean(),
            Model.findOneAndDelete({
              _id: id,
            }).lean(),
            Wallet.deleteOne({
              _id: model.wallet._id,
            }),
            Approval.deleteOne({
              _id: model.approval._id,
            }),
            ModelDocuments.deleteOne({
              _id: model.document._id,
            }),
          ])
        })
        .then(([user, model]) => {
          const theModel = {
            ...model,
            rootUser: {
              ...user,
            },
          }
          return Promise.all([
            theModel,
            Viewer.updateMany(
              {
                following: model._id,
              },
              {
                $pull: { following: model._id },
              }
            ),
            deleteObjects(objectsToDelete),
          ])
        })
        .then(([model, viewerUpdate]) => {
          return {
            deletedResource: model,
            logMsg: `Model @${theModel.rootUser.username} was deleted successfully, and ${viewerUpdate.nModified} viewers were updated successfully`,
          }
        })
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
      break
    case "Stream":
      /**
       * cannot delete for now
       */
      break
    case "AudioCall":
      /**
       * cascade delete:
       * delete from other entries:
       */
      break
    case "VideoCall":
      /**
       * cascade delete:
       * delete from other entries:
       */
      break
    case "CoinSpendHistory":
      /**
       * should not be deleteable initially
       */
      break
    case "ModelDocuments":
      /**
       * should not be able to delete directly, should
       * be delete by system when model delete occurs, not sure have to think more ???
       */
      break
    case "CoinPurchase":
      /**
       * cannot be deleted
       */
      break
    case "Tag":
      /**
       * cascade delete: nothing
       * delete from other entries: remove from model
       */
      break
    case "Approval":
      /**
       * no direct delete, will be delete when model delete occurs
       */
      break
    case "Permission":
      /**
       * cannot be deleted
       */
      break
    case "Staff":
      /**
       * cascade delete: user,
       * delete from other entries:
       */
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
      break
    case "Coupon":
      /**
       * cascade delete: nothing
       * delete from other entries:nothing
       */
      deleteQuery = Coupon.findOneAndDelete({
        _id: id,
      })
        .lean()
        .then((coupon) => {
          return {
            deletedResource: coupon,
            logMsg: `Coupon ${coupon._id} for ${coupon.forCoins} coins, was deleted`,
          }
        })
      break
    case "PriceRange":
      /**
       * check before delete that this priceRange should not be already
       * currently alloted to any model
       */
      break
    case "ImageAlbum":
      /**
       * HAVE THINK ABOUT IT ????
       */
      break
    case "VideoAlbum":
      /**
       * HAVE THINK ABOUT IT ????
       */
      break
    case "PrivateChatPlan":
      /**
       * can not be deleted if someone have this as active plan
       * flag this plan as "inactive" and wait for expiry of plans
       * after time delete it
       */
      deleteQuery = PrivateChatPlan.findOneAndDelete({
        _id: id,
      })
        .lean()
        .then((chatPlan) => {
          return {
            deletedResource: chatPlan,
            logMsg: `Chat plan ${chatPlan.name}, was deleted`,
          }
        })
      break
    default:
      /**
       * throw error invalid resource requested
       */
      break
  }

  deleteQuery
    .then(({ deletedResource, logMsg }) => {
      return Promise.all([
        deletedResource,
        Log({
          msg: logMsg,
          by: "61da8ea900622555940aacb7",
        }),
      ])
    })
    .then(([deletedResource, _log]) => {
      console.log(_log.msg)
      return res.status(200).json(deletedResource)
    })
    .catch((err) => next(err))
}

// {
//   $unset: {
//     approval: 1,
//     documents: 1,
//     followers: 1,
//     numberOfFollowers: 1,
//     tipMenuActions: 1,
//     sharePercent: 1,
//     charges: 1,
//     minCallDuration: 1,
//     publicImages: 1,
//     publicVideos: 1,
//     privateImages: 1,
//     privateVideos: 1,
//     videoCallHistory: 1,
//     audioCallHistory: 1,
//     wallet: 1,
//     privateChats: 1,
//   },
// }
