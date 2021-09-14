const router = require("express").Router()
const tokenBuilderController = require("../../controllers/agora/tokenBuildersController")
const tokenVerify = require("../../middlewares/tokenVerify")
const userTypeChecker = require("../../middlewares/userTypeChecker")

router.post("/create-stream-and-gen-token", tokenVerify, userTypeChecker.checkForModel, tokenBuilderController.createStreamAndToken)
router.post("/create-unauthed-user-and-join-stream", tokenBuilderController.generateRtcTokenUnauthed)
router.post("/authed-viewer-join-stream", tokenVerify, userTypeChecker.checkForViewer, tokenBuilderController.generateRtcTokenUnauthed)
router.post("/unauthed-viewer-join-stream", tokenBuilderController.generateRtcTokenUnauthed)
router.post("/global-renew-token", tokenVerify, tokenBuilderController.generateRtcTokenUnauthed)

module.exports = router