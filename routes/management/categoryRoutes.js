const router = require("express").Router()
const { body } = require("express-validator")
const categoryController = require("../../controllers/management/categoryController")
const tokenVerify = require("../../middlewares/tokenVerify")
const {checkForSuperAdminOrStaff} = require("../../middlewares/userTypeChecker")


router.post("/create", tokenVerify,[
    body("name").notEmpty().isString(),
],checkForSuperAdminOrStaff, categoryController.createCategory)

module.exports = router