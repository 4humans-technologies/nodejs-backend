const router = require("express").Router()
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
const privateContent = require("../../controllers/stream/PrivateContent")

router.post(
  "/buy-private-image-album",
  tokenVerifyWithOutPopulate,
  privateContent.buyPrivateImageAlbum
)
router.post(
  "/buy-private-video-album",
  tokenVerifyWithOutPopulate,
  privateContent.buyPrivateVideosAlbum
)

module.exports = router
