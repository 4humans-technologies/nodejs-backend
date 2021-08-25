const router = require("express").Router()
const { body } = require("express-validator")
const superadminController = require("../../controllers/register/superadminController")

router.post("/", superadminController.createSuperAdmin)

module.exports = router