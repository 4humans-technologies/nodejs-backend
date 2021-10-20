const router = require("express").Router()
const streamController = require("../../controllers/stream/streamController")
const tokenVerify = require("../../middlewares/tokenVerify")

router.get("/create-stream-without-token", tokenVerify, streamController.withOutTokenStreamStart)
router.post("/handle-stream-end", tokenVerify, streamController.handleEndStream)
router.post("/set-ongoing", streamController.setOngoing)
router.post("/get-private-chat-plans", streamController.setOngoing)
router.post(
  "/process-token-gift",
  tokenVerify,
  streamController.processTokenGift
)

module.exports = router
