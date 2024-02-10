const router = require("express").Router()
const privateChatController = require("../../controllers/ADMIN/privateChat")

router.post("/create-new-chatplan", privateChatController.createNewChatPlan)
router.post("/get-active-chatplans", privateChatController.getActiveChatPlans)

module.exports = router
