const router = require("express").Router()
const couponController = require("../../controllers/ADMIN/couponController")
const {
  checkForSuperAdminOrStaffWithPermission,
} = require("../../middlewares/userTypeChecker")
const tokenVerify = require("../../middlewares/tokenVerify")

const { body } = require("express-validator")

router.post(
  "/generate-coupon-code",
  [body("forCoins").isInt()],
  tokenVerify,
  (req, res, next) => {
    if (req.user.permissions.includes("create-coupon")) {
      next()
    } else {
      const err = new Error(
        "Permission denied, you don't have permission to perform this action"
      )
      err.statusCode = 403
      return next(error)
    }
  },
  couponController.generateNewCouponCode
)

module.exports = router
