const router = require("express").Router()
const streamController = require("../../controllers/stream/streamController")
const tokenVerify = require("../../middlewares/tokenVerify")
const putUserInRequest = require("../../middlewares/putUserInRequest")
const { body } = require("express-validator")

router.get(
  "/create-stream-without-token",
  tokenVerify,
  streamController.withOutTokenStreamStart
)

router.post("/set-call-ongoing", tokenVerify, streamController.setCallOngoing)
router.post("/handle-stream-end", tokenVerify, streamController.handleEndStream)
router.post("/set-ongoing", streamController.setOngoing)
router.post("/get-private-chat-plans", streamController.setOngoing)
router.post(
  "/process-token-gift",
  tokenVerify,
  streamController.processTokenGift
)
router.post(
  "/re-join-models-currentstream-authed",
  tokenVerify,
  streamController.reJoinModelsCurrentStreamAuthed
)
router.post(
  "/re-join-models-currentstream-unauthed",
  streamController.reJoinModelsCurrentStreamUnAuthed
)
router.post(
  "/handle-viewer-call-request",
  tokenVerify,
  streamController.handleViewerCallRequest
)
router.post(
  "/accepted-call-request",
  tokenVerify,
  streamController.handleModelAcceptedCallRequest
)
router.post("/follow-model", tokenVerify, streamController.viewerFollowModel)

router.post(
  "/handle-call-end-from-model",
  tokenVerify,
  streamController.handleEndCallFromModel
)

router.post(
  "/handle-call-end-from-viewer",
  tokenVerify,
  streamController.handleEndCallFromViewer
)
router.post(
  "/request-process-tip-menu-action",
  [
    body("activity").isObject(),
    body("socketData").isObject(),
    body("modelId").isString(),
    body("room").isString(),
  ],
  tokenVerify,
  streamController.processTipMenuRequest
)

router.post(
  "/get-model-tipmenu-actions",
  [body("modelId").notEmpty().isString()],
  streamController.getTipMenuActions
)

router.get("/get-active-chat-plans", streamController.getChatPlans)
router.get("/get-live-room-count/:room", streamController.getLiveRoomCount)
router.post("/buy-chat-plan", tokenVerify, streamController.buyChatPlan)

module.exports = router
