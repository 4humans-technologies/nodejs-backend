const express = require("express");
const authController = require("../controllers/auth")

const router = express.Router()

router.post("/signup",authController.signupHandler)

module.exports = router