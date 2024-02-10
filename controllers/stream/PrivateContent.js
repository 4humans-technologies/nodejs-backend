/**
 * for purchasing of private videos and images
 */
const Model = require("../../models/userTypes/Model")
const Viewer = require("../../models/userTypes/Viewer")
const Wallet = require("../../models/globals/wallet")
const ImageAlbum = require("../../models/globals/ImageAlbum")
const VideosAlbum = require("../../models/globals/VideosAlbum")
const Notifier = require("../../utils/Events/Notification")

exports.buyPrivateImageAlbum = (req, res, next) => {
  const { modelId, albumId } = req.body
  let modelGot
  let albumCost
  Promise.all([
    Model.findOne({
      _id: modelId,
    })
      .lean()
      .select("privateImages sharePercent"),
    Viewer.findById(req.user.relatedUser._id).select(
      "privateImagesPlans name profileImage"
    ),
    Wallet.findOne({ rootUser: req.user._id }),
    ImageAlbum.findById(albumId).select("name price purchases"),
  ])
    .then(([model, viewer, wallet, imageAlbum]) => {
      if (
        model.privateImages.map((id) => id.toString()).includes(albumId) &&
        imageAlbum
      ) {
        /* if album exists/created by the model */
        if (wallet.currentAmount >= imageAlbum.price) {
          const modelAlbums = viewer.privateImagesPlans.find(
            (entry) => entry.model.toString() === modelId
          )
          if (
            !modelAlbums?.albums.map((id) => id.toString()).includes(albumId)
          ) {
            /* if album *NOT* already purchased */
            if (modelAlbums) {
              /* if has purchased any other album of this model */
              modelAlbums.albums.push(albumId)
              viewer.markModified("privateImagesPlans")
              wallet.deductAmount(imageAlbum.price)
            } else {
              /* if has *NOT* purchased any other album of this model */
              viewer.privateImagesPlans = [
                {
                  model: modelId,
                  albums: [albumId],
                },
              ]

              wallet.deductAmount(imageAlbum.price)
            }
            albumCost = imageAlbum.price
            modelGot = imageAlbum.price * (model.sharePercent / 100)
            imageAlbum.purchases = imageAlbum.purchases + 1
            return Promise.all([
              viewer.save(),
              imageAlbum.save(),
              Wallet.updateOne(
                {
                  relatedUser: modelId,
                },
                {
                  $inc: {
                    currentAmount: modelGot,
                  },
                }
              ),
              wallet.save(),
            ])
          } else {
            /* plan already purchased */
            const error = new Error("Album already purchased")
            error.statusCode = 400
            throw error
          }
        } else {
          /* error requested album not found */
          const error = new Error(
            "You don't have required amount of coins to purchase this album"
          )
          error.statusCode = 400
          throw error
        }
      } else {
        /* error requested album not found */
        const error = new Error(
          "Invalid albumId, Album does not exists please reload the page to get the updated albums"
        )
        error.statusCode = 400
        throw error
      }
    })
    .then(([viewer, imageAlbum]) => {
      Notifier.newModelNotification("image-album-purchase", modelId, {
        viewer: {
          name: viewer.name,
          profileImage: viewer.profileImage,
          _id: viewer._id,
        },
        album: {
          _id: imageAlbum._id,
          name: imageAlbum.name,
        },
        debited: modelGot,
        albumCost: albumCost,
      })
      return res.status(200).json({
        actionStatus: "success",
        privateImages: viewer.privateImagesPlans,
        albumCost: albumCost,
      })
    })
    .catch((err) => {
      next(err)
    })
}

exports.buyPrivateVideosAlbum = (req, res, next) => {
  /*  */
  const { modelId, albumId } = req.body

  let modelGot
  let albumCost
  Promise.all([
    Model.findOne({
      _id: modelId,
    })
      .lean()
      .select("privateVideos sharePercent"),
    Viewer.findById(req.user.relatedUser._id).select(
      "privateVideosPlans name profileImage"
    ),
    Wallet.findOne({ rootUser: req.user._id }),
    VideosAlbum.findById(albumId).select("price purchases name"),
  ])
    .then(([model, viewer, wallet, videosAlbum]) => {
      if (
        model.privateVideos.map((id) => id.toString()).includes(albumId) &&
        videosAlbum
      ) {
        /* if album exists/created by the model */
        if (wallet.currentAmount >= videosAlbum.price) {
          const modelAlbums = viewer.privateVideosPlans.find(
            (entry) => entry.model.toString() === modelId
          )
          if (
            !modelAlbums?.albums.map((id) => id.toString()).includes(albumId)
          ) {
            /* if album *NOT* already purchased */
            if (modelAlbums) {
              /* if has purchased any other album of this model */
              modelAlbums.albums.push(albumId)
              viewer.markModified("privateVideosPlans")
              wallet.deductAmount(videosAlbum.price)
            } else {
              /* if has *NOT* purchased any other album of this model */
              viewer.privateVideosPlans = [
                {
                  model: modelId,
                  albums: [albumId],
                },
              ]

              wallet.deductAmount(videosAlbum.price)
            }
            albumCost = videosAlbum.price
            modelGot = videosAlbum.price * (model.sharePercent / 100)
            videosAlbum.purchases = videosAlbum.purchases + 1
            return Promise.all([
              viewer.save(),
              Wallet.updateOne(
                {
                  relatedUser: modelId,
                },
                {
                  $inc: {
                    currentAmount: modelGot,
                  },
                }
              ),
              wallet.save(),
            ])
          } else {
            /* plan already purchased */
            const error = new Error("Album already purchased")
            error.statusCode = 400
            throw error
          }
        } else {
          /* error requested album not found */
          const error = new Error(
            "You don't have required amount of coins to purchase this album"
          )
          error.statusCode = 400
          throw error
        }
      } else {
        /* error requested album not found */
        const error = new Error(
          "Invalid albumId, Album does not exists please reload the page to get the updated albums"
        )
        error.statusCode = 400
        throw error
      }
    })
    .then(([viewer, videoAlbum]) => {
      Notifier.newModelNotification("video-album-purchase", modelId, {
        viewer: {
          name: viewer.name,
          profileImage: viewer.profileImage,
          _id: viewer._id,
        },
        album: {
          _id: videoAlbum._id,
          name: videoAlbum.name,
        },
        debited: modelGot,
        albumCost: albumCost,
      })
      return res.status(200).json({
        actionStatus: "success",
        privateVideos: viewer.privateVideosPlans,
        albumCost: albumCost,
      })
    })
    .catch((err) => {
      next(err)
    })
}
