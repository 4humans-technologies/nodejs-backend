const router = require("express").Router()
const giftsController = require("../../controllers/gifts/gifts")

router.get("/get-gifts", giftsController.getGifts)
router.post("/purchase-gift", giftsController.handleGiftPurchase)

module.exports = router
