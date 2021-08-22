const express = require("express");
const { body } = require('express-validator');
const User = require('../models/User')
const authController = require("../controllers/auth")

const router = express.Router()

router.post("/signup",authController.viewerSignupHandler)

router.post("/login",authController.loginHandler)

module.exports = router