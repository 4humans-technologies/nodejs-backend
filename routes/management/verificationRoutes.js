const router = require("express").Router()
const verificationController = require("../../controllers/management/verificationController")

router.post("/confirm-email", verificationController.handleEmailConformation)
router.post(
  "/send-password-reset-link",
  verificationController.sendPasswordLink
)
router.post("/initial-link-verify", verificationController.verifyTokenInitially)
router.post(
  "/verify-token-and-reset-password",
  verificationController.verifyTokenAndReset
)

module.exports = router
