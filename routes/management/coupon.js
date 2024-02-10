const router = require("express").Router()
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
const couponController = require("../../controllers/management/coupon")

router.post(
  "/redeem-coupon-viewer",
  tokenVerifyWithOutPopulate,
  couponController.redeemCouponCode
)

module.exports = router
