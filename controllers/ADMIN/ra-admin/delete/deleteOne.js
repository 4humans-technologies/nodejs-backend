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

  if (!req.user.permissions.includes(`delete-${resource}`)) {
    return Log({
      msg: `🔴 [ALERT] ${req.user?.username} tried to delete ${resource} which he does not have permission to`,
      by: req.user?.userId,
    })
      .save()
      .then((log) => {
        console.log(log.msg)
        return res
          .status(403)
          .json({ message: `You are not authorized to delete ${resource}` })
      })
      .catch((err) => {
        console.error(err)
        return next(err)
      })
  }

  var deleteQuery
  var objectsToDelete = []
  switch (resource) {
    case "UnApprovedModel":
      deleteQuery = Promise.all([
        Model.findById(id)
          .select(
            "rootUser documents profileImage coverImage backGroundImage approval wallet"
          )
          .lean(),
        ModelDocuments.findOne({
          model: id,
        }).lean(),
      ])
        .then(([model, documents]) => {
          objectsToDelete.push(model.profileImage)
          objectsToDelete.push(model.coverImage)
          objectsToDelete.push(model.backGroundImage)

          if (documents) {
            documents.images.forEach((image) => {
              objectsToDelete.push(image)
            })
          }

          const promiseArray = [
            User.findOneAndDelete({
              _id: model.rootUser._id,
            }).lean(),
            Model.findOneAndDelete({
              _id: id,
            }).lean(),
            Wallet.deleteOne({
              _id: model.wallet._id,
            }),
          ]

          if (model?.approval) {
            promiseArray.push(
              Approval.deleteOne({
                _id: model.approval._id,
              })
            )
          }

          if (documents) {
            promiseArray.push(
              ModelDocuments.deleteOne({
                _id: documents._id,
              })
            )
          }

          return Promise.all(promiseArray)
        })
        .then(([user, model]) => {
          return Promise.all([
            {
              id: model._id,
              ...model,
              rootUser: {
                ...user,
              },
            },
            deleteImages(objectsToDelete),
          ])
        })
        .then(([model, objDelete]) => {
          return {
            deletedResource: model,
            logMsg: `Un-Approved Model @${model.rootUser.username} was deleted.`,
          }
        })
      break
    case "Model":
      /**
       * cascade delete: rootUser,wallet,approval,document,public Albums,?privateChats, ?privateAlbums
       * delete for other entries:remove from viewers followingList,
       */

      deleteQuery = Promise.all([
        Model.findById(id)
          .select(
            "rootUser wallet approval documents privateChats profileImage publicImages publicVideos coverImage backGroundImage"
          )
          .lean(),
        ModelDocuments.findOne({
          model: id,
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

          if (documents) {
            documents.images.forEach((image) => {
              objectsToDelete.push(image)
            })
          }

          /**
           * Complete delete of model will happen by custom script or from
           * database
           */

          /**
           * how to
           * handle it's remaining reference in tokenhistories,chats,albums,calls,streams etc
           */
          const promiseArray = [
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
          ]

          if (documents) {
            promiseArray.push(
              ModelDocuments.deleteOne({
                _id: documents._id,
              })
            )
          }
          return Promise.all(promiseArray)
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
            deleteImages(objectsToDelete),
          ])
        })
        .then(([model, viewerUpdate, objDelete]) => {
          return {
            deletedResource: model,
            logMsg: `Model @${model.rootUser.username} was deleted successfully, and ${viewerUpdate.nModified} viewers were updated successfully`,
          }
        })
      break
    case "Viewer":
      /**
       * cascade delete: rooUser,wallet
       * delete from other entries: models following list and dec count
       */
      deleteQuery = Viewer.findById(id)
        .select(
          "rootUser wallet privateChats following profileImage backgroundImage"
        )
        .lean()
        .then((viewer) => {
          objectsToDelete.push(viewer.profileImage)
          objectsToDelete.push(viewer.backgroundImage)

          /**
           *
           */
          return Promise.all([
            Viewer.findOneAndDelete({
              _id: viewer._id,
            }),
            User.findOneAndDelete({
              _id: viewer.rootUser._id,
            }),
            Wallet.findOneAndDelete({
              _id: viewer.wallet._id,
            }),
            ModelViewerPrivateChat.deleteOne({
              _id: viewer.privateChats._id,
            }),
          ])
        })
        .then(([viewer, user, wallet]) => {
          const deletedResource = {
            id: viewer._id,
            ...viewer._doc,
            rootUser: {
              ...user._doc,
            },
            wallet: {
              ...wallet._doc,
            },
          }

          return Promise.all([
            deletedResource,
            Model.updateOne(
              {
                id: { $in: viewer.following },
              },
              {
                $pull: { followers: id },
                $inc: { numberOfFollowers: -1 },
              }
            ),
            deleteImages(objectsToDelete),
          ])
        })
        .then(([deletedResource, modelUpdate, objDelete]) => {
          return {
            deletedResource,
            logMsg: `Viewer @${deletedResource.rootUser.username} was deleted successfully!`,
          }
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
      if (id === req.user.staffId) {
        const error = new Error("You can not delete yourself!")
        error.statusCode = 422
        deleteQuery = new Promise((resolve, reject) => {
          return reject(error)
        })
        break
      }
      deleteQuery = Promise.all([
        Staff.findOneAndDelete({
          _id: id,
        }).lean(),
        User.findOneAndDelete({
          relatedUser: id,
        }).lean(),
      ])
        .then(([staff, user]) => {
          const deletedResource = {
            ...staff,
            rootUser: user,
          }
          return Promise.all([
            deletedResource,
            Log.updateMany(
              {
                by: user._id,
              },
              {
                $set: { username: `${user.username}[Deleted]` },
                $unset: { by: 1 },
              }
            ),
          ])
        })
        .then(([deletedResource, logUpdateResult]) => {
          return {
            deletedResource: deletedResource,
            logMsg: `Staff ${deletedResource.rootUser.username} was deleted and ${logUpdateResult.nModified} Logs were updated successfully by ${req.user.username}.`,
          }
        })
      /**
       * cascade delete: user,
       * delete from other entries:
       */
      break
    case "Role":
      /**
       * if deleted what about his entries, like approval,role,plans tags etc
       * ** no active role should be deleted**
       * have to relive all the staff from their roles and
       * and then the role can be deleted
       */
      deleteQuery = User.find({
        role: id,
      })
        .lean()
        .select("username -_id")
        .then((users) => {
          if (users.length !== 0) {
            const error = new Error(
              `${users
                .map((user) => user.username)
                .join(", ")} still have this role alloted to them! ⚠ ⚠`
            )
            error.statusCode = 422
            throw error
          }
          return Role.findOneAndDelete({
            _id: id,
          }).lean()
        })
        .then((role) => {
          return {
            deletedResource: role,
            logMsg: `Role ${role.roleName} was deleted`,
          }
        })
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
          by: req.user.userId,
        }).save(),
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
