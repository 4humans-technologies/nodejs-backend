const router = require("express").Router()
const tokenVerify = require("../../middlewares/tokenVerify")
const couponController = require("../../controllers/management/coupon")

router.post(
  "/redeem-coupon-viewer",
  tokenVerify,
  couponController.redeemCouponCode
)

module.exports = router
