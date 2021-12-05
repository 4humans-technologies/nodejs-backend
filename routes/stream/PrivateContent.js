const router = require("express").Router()
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
const privateContent = require("../../controllers/stream/PrivateContent")

router.post(
  "/buy-private-image-album",
  tokenVerifyWithOutPopulate,
  privateContent.buyPrivateImageAlbum
)

module.exports = router
