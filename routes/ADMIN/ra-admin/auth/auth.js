const router = require("express").Router()
const auth = require("../../../../controllers/ADMIN/ra-admin/auth/auth")
const ui = require("../../../../controllers/ADMIN/ra-admin/auth/ui")
const adminTokenVerify = require("../../../../middlewares/adminTokenVerify")

router.post("/login", auth.loginStaff)
router.get("/compose-dashboard", adminTokenVerify, ui.composeDashboard)
router.get("/get-streamed-minutes/:modelId", ui.getStreamedMinutes)

module.exports = router
