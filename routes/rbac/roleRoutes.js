const router = require("express").Router()
const roleController = require("../../controllers/rbac/roleController")

// NECESSARY MIDDLEWARE--->
const verifyToken = require("../../middlewares/tokenVerify")
const permissionChecker = require("../../middlewares/adminOrStaffChecker")

router.post("/create-role", verifyToken, permissionChecker, roleController.createRole)

router.post("/update-role", verifyToken, permissionChecker, roleController.updateRole)

router.post("/remove-role", verifyToken, permissionChecker, roleController.removeRole)

router.get("/get-role/:roleId", verifyToken, permissionChecker, roleController.getRole)

router.get("/get-all-role", verifyToken, permissionChecker, roleController.getAllRoles)

module.exports = router