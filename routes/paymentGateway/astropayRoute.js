const router = require("express").Router()
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
const deposit = require("../../controllers/paymentGateway/AstropayController")

router.post(
  "/deposit",
  tokenVerifyWithOutPopulate,
  deposit.deposit
)

router.post(
    "/callback",
    deposit.callback
)

module.exports = router