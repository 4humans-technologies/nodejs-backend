const router = require("express").Router()
const privateChatController = require("../../controllers/stream/privateChatController")
const tokenVerify = require("../../middlewares/tokenVerify")
const verifyViewerWithSelect = require("../../middlewares/verifyViewerWithSelect")

router.post(
  "/find-or-create-private-chat",
  tokenVerify,
  privateChatController.findOrCreatePrivateChat
)

router.post(
  "/check-if-private-chat-exists",
  tokenVerify,
  privateChatController.getPrivateChatByQuickFindIndex
)

router.post(
  "/buy-chat-plan",
  (req, res, next) => {
    verifyViewerWithSelect(req, res, next, "username userType relatedUser", {
      path: "relatedUser",
      select: "wallet",
      populate: {
        path: "wallet",
        select: "currentAmount",
      },
    })
  },
  privateChatController.buyChatPlanForViewer
)

router.post(
  "/get-my-private-cht-by-id",
  tokenVerify,
  privateChatController.getPrivateChatById
)

router.get("/get-active-chat-plans", privateChatController.getActiveChatPlans)

module.exports = router
