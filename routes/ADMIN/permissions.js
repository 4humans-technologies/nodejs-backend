const router = require("express").Router()
const tokenVerify = require("../../middlewares/tokenVerify")
const adminPermissionController = require("../../controllers/ADMIN/permission")

router.get("/generate-all", adminPermissionController.generateAllPermissions)

module.exports = router