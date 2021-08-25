const express = require("express");
const permissionController = require("../../controllers/rbac/permissionController")
const router = express.Router()
const verifyUser = require("../../middlewares/tokenVerify")
const {checkForSuperAdminOrStaff} = require("../../middlewares/userTypeChecker")

// permission curd
router.get("/get-permission/:id", verifyUser, checkForSuperAdminOrStaff, permissionController.getAllPermissions)

router.post("/create-permission", verifyUser, checkForSuperAdminOrStaff, permissionController.createPermission)

router.get("/all-permission", verifyUser, checkForSuperAdminOrStaff, permissionController.getAllPermissions)

router.post("/remove-permission", verifyUser, checkForSuperAdminOrStaff, permissionController.removePermission)


// permission generation
router.post("/generate-permissions-for", permissionController.generatePermissionsFor)

module.exports = router