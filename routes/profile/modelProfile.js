const router = require("express").Router()
const modelProfileData = require("../../controllers/profile/modelProfile")
const tokenVerify = require("../../middlewares/tokenVerify")

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

module.exports = router
