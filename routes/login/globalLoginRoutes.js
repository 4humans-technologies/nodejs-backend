const router = require("express").Router()
const globalLoginController = require("../../controllers/login/globalLoginController")
const User = require("../../models/User")
const { body } = require("express-validator")


router.post("/",[
    body("username").notEmpty().trim().isString().isLength({ min: 5, max: 24 }),
    body("password").notEmpty().isString()
],globalLoginController.loginHandler)


module.exports = router