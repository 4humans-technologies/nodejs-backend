const express = require("express");
const permissionController = require("../../controllers/rbac/permissionController")
const router = express.Router()
const verifyUser = require("../../middlewares/tokenVerify")
const permissionChecker = require("../../middlewares/adminOrStaffChecker")

// permission curd
router.get("/get-permission/:id", verifyUser, permissionChecker, permissionController.getAllPermissions)

router.post("/create-permission", verifyUser, permissionChecker, permissionController.createPermission)

router.get("/all-permission", verifyUser, permissionChecker, permissionController.getAllPermissions)

router.post("/remove-permission", verifyUser, permissionChecker, permissionController.removePermission)


// permission generation
router.post("/generate-permissions-for", permissionController.generatePermissionsFor)

module.exports = router