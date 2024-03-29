const router = require("express").Router()
const tokenBuilderController = require("../../controllers/agora/tokenBuildersController")
const tokenVerify = require("../../middlewares/tokenVerify")
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
const safeTokenDecode = require("../../middlewares/safeTokenDecode")
const userTypeChecker = require("../../middlewares/userTypeChecker")

router.post(
  "/create-stream-and-gen-token",
  tokenVerify,
  userTypeChecker.checkForModel,
  tokenBuilderController.createStreamAndToken
)
router.post(
  "/create-unauthed-user-and-join-stream",
  tokenBuilderController.generateRtcTokenUnauthed
)
router.post(
  "/authed-viewer-join-stream",
  tokenVerifyWithOutPopulate,
  userTypeChecker.checkForViewer,
  tokenBuilderController.genRtcTokenViewer
)
router.post(
  "/unauthed-viewer-join-stream",
  tokenBuilderController.generateRtcTokenUnauthed
)
router.get(
  "/global-renew-token",
  safeTokenDecode,
  tokenBuilderController.renewRtcTokenGlobal
)

module.exports = router
