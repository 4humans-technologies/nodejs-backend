const router = require("express").Router()
const callController = require("../../controllers/call/callController")

router.post("/call-to-viewer", callController.handleModelCallingToViewer)
router.post("/cancel-call-to-viewer", callController.handleModelCancelingCall)
router.post("/get-call-start-token", callController.giveTokenForCallStart)
router.post("/start-call", callController.callStartedHandler)
router.post("/call-stat-polling", callController.validityPollingHandler)
router.post("/call-token-renew", callController.onCallTokenRenew)

module.exports = router