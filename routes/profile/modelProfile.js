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

router.post(
  "/update-info-fields",
  tokenVerify,
  [
    body("name").notEmpty().isString(),
    body("ethnicity").notEmpty().isString(),
    body("hairColor").notEmpty().isString(),
    body("eyeColor").notEmpty().isString(),
    body("country").notEmpty().isString(),
    body("bodyType").notEmpty().isString(),
    body("skinColor").notEmpty().isString(),
    body("dynamicFields").notEmpty().isArray(),
  ],
  modelProfileData.updateInfoFields
)

router.post(
  "/get-asked-fields",
  tokenVerify,
  [body("fetchFields").isArray()],
  modelProfileData.getAskedFields
)

router.post(
  "/get-model-token-history",
  tokenVerify,
  modelProfileData.getTokenHistoryOfModel
)

module.exports = router
