/**
 * for purchasing of private videos and images
 */
const Model = require("../../models/userTypes/Model")
const Viewer = require("../../models/userTypes/Viewer")
const Wallet = require("../../models/globals/wallet")
const ImageAlbum = require("../../models/globals/ImageAlbum")
const VideosAlbum = require("../../models/globals/VideosAlbum")

exports.buyPrivateImageAlbum = (req, res, next) => {
  /*  */
  const { modelId, albumId } = req.body

  Promise.all([
    Model.findOne({
      _id: modelId,
    })
      .lean()
      .select("privateImages sharePercent"),
    Viewer.findById(req.user.relatedUser._id).select("privateImagesPlans"),
    Wallet.findOne({ rootUser: req.user._id }),
    ImageAlbum.findById(albumId).select("price purchases"),
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
              viewer.markModified("privateImages")
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
            return Promise.all([
              viewer.save(),
              Wallet.updateOne(
                {
                  relatedUser: modelId,
                },
                {
                  $inc: {
                    currentAmount:
                      imageAlbum.price * (model.sharePercent / 100),
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
    .then((viewer) => {
      return res.status(200).json({
        actionStatus: "success",
        privateImages: viewer.privateImagesPlans,
      })
    })
    .catch((err) => {
      next(err)
    })
}

exports.buyPrivateVideosAlbum = (req, res, next) => {
  const { modelId, albumId } = req.body

  Promise.all([
    Model.findOne({
      _id: modelId,
    })
      .lean()
      .select("privateVideos sharePercent"),
    Viewer.findById(req.user.relatedUser._id).select("privateVideosPlans"),
  ])
    .then(([model, viewer]) => {
      if (model.privateVideos.includes(albumId)) {
        const modelAlbums = viewer.privateVideos.find(
          (entry) => entry.model === modelId
        )
        if (!modelAlbums?.album.includes(albumId)) {
          if (modelAlbums) {
            viewer.privateVideos = viewer.privateVideos.map((entry) => {
              if (entry.model === modelId) {
                entry.albums.push(albumId)
              }
            })
            return viewer.save()
          } else {
            viewer.privateVideos = viewer.privateVideos.push({
              model: modelId,
              albums: [albumId],
            })
            return viewer.save()
          }
        } else {
          /* plan already purchased */
          const error = new Error("Album already purchased")
          error.statusCode = 400
          throw error
        }
      } else {
        /* error requested album not found */
        const error = new Error("Invalid albumId, Album does not exists")
        error.statusCode = 400
        throw error
      }
    })
    .then((viewer) => {
      return res.status(200).json({
        actionStatus: "success",
        privateVideos: viewer.privateVideos,
      })
    })
    .catch((err) => {
      next(err)
    })
}
