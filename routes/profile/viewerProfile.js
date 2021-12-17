const router = require("express").Router()
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
const viewerProfileController = require("../../controllers/profile/viewerProfile")

router.get(
  "/get-followed-models-detail",
  tokenVerifyWithOutPopulate,
  viewerProfileController.getFollowedModelDetails
)
router.get(
  "/get-coins-spend-history",
  tokenVerifyWithOutPopulate,
  viewerProfileController.coinsHistory
)
router.put(
  "/update-profile-info",
  tokenVerifyWithOutPopulate,
  viewerProfileController.updateProfileInfo
)

module.exports = router
