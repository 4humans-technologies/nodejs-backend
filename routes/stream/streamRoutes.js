const router = require("express").Router()
const streamController = require("../../controllers/stream/streamController")
const tokenVerify = require("../../middlewares/tokenVerify")
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
const putUserInRequest = require("../../middlewares/putUserInRequest")
const { body } = require("express-validator")

router.post("/set-call-ongoing", tokenVerify, streamController.setCallOngoing)
router.post(
  "/handle-stream-end",
  tokenVerifyWithOutPopulate,
  streamController.handleEndStream
)
router.post("/set-ongoing", streamController.setOngoing)
router.post("/get-private-chat-plans", streamController.setOngoing)
router.post(
  "/process-token-gift",
  tokenVerifyWithOutPopulate,
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

router.post(
  "/follow-model",
  tokenVerifyWithOutPopulate,
  streamController.viewerFollowModel
)

router.post(
  "/handle-call-end-from-model",
  tokenVerifyWithOutPopulate,
  streamController.handleEndCallFromModel
)

router.post(
  "/handle-call-end-from-viewer",
  tokenVerifyWithOutPopulate,
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
router.get("/get-live-viewers/:room", streamController.getLiveRoomCount)
router.post("/buy-chat-plan", tokenVerify, streamController.buyChatPlan)
router.get(
  "/get-a-viewers-details/:viewerId",
  streamController.getAViewerDetails
)

module.exports = router
