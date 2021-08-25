const router = require("express").Router()
const roleController = require("../../controllers/rbac/roleController")

// NECESSARY MIDDLEWARE--->
const verifyToken = require("../../middlewares/tokenVerify")
const {checkForSuperAdminOrStaff} = require("../../middlewares/userTypeChecker")

router.post("/create-role", verifyToken, checkForSuperAdminOrStaff, roleController.createRole)

router.post("/update-role", verifyToken, checkForSuperAdminOrStaff, roleController.updateRole)

router.post("/remove-role", verifyToken, checkForSuperAdminOrStaff, roleController.removeRole)

router.get("/get-role/:roleId", verifyToken, checkForSuperAdminOrStaff, roleController.getRole)

router.get("/get-all-role", verifyToken, checkForSuperAdminOrStaff, roleController.getAllRoles)

module.exports = router