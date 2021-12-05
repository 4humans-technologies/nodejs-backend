const router = require("express").Router()
const modelProfileData = require("../../controllers/profile/modelProfile")
const tokenVerify = require("../../middlewares/tokenVerify")
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
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
  "/handle-private-image-upload",
  tokenVerify,
  [body("newImageUrl").isURL()],
  modelProfileData.handlePrivateImageUpload
)

router.post(
  "/handle-public-video-upload",
  tokenVerify,
  [body("newVideoUrl").isURL({ require_host: true })],
  modelProfileData.handlePublicVideosUpload
)

router.post(
  "/handle-private-video-upload",
  tokenVerify,
  [body("newVideoUrl").isURL({ require_host: true })],
  modelProfileData.handlePrivateVideoUpload
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
  tokenVerifyWithOutPopulate,
  modelProfileData.getTokenHistoryOfModel
)

router.post("/update-password", tokenVerify, modelProfileData.updatePassword)

router.post(
  "/create-album",
  [
    body("name").notEmpty().isString(),
    body("price").notEmpty().isNumeric(),
    body("type").custom((value, { req }) => {
      if (["imageAlbum", "videoAlbum"].includes(value)) {
        return true
      } else {
        throw new Error(
          "type can be 'imageAlbum' or 'videoAlbum' " + value + " was provided"
        )
      }
    }),
  ],
  tokenVerifyWithOutPopulate,
  modelProfileData.createContentAlbum
)

module.exports = router
