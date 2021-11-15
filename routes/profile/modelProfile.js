const router = require("express").Router()
const modelProfileData = require("../../controllers/profile/modelProfile")
const tokenVerify = require("../../middlewares/tokenVerify")
const { body } = require("express-validator")

router.get(
  "/get-model-profile-data",
  tokenVerify,
  modelProfileData.getModelProfileData
)
router.post(
  "/update-model-tipmenu-actions",
  tokenVerify,
  modelProfileData.updateTipMenuActions
)

router.post(
  "/update-model-basic-details",
  tokenVerify,
  modelProfileData.updateModelBasicDetails
)

router.post(
  "/handle-public-image-upload",
  tokenVerify,
  [body("newImageUrl").isURL()],
  modelProfileData.handlePublicImageUpload
)

router.post(
  "/handle-public-video-upload",
  tokenVerify,
  [body("newVideoUrl").isURL({ require_host: true })],
  modelProfileData.handlePublicVideosUpload
)

module.exports = router
