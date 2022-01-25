const router = require("express").Router()
const auth = require("../../../../controllers/ADMIN/ra-admin/auth/auth")
const ui = require("../../../../controllers/ADMIN/ra-admin/auth/ui")

router.post("/login", auth.loginStaff)
router.get("/compose-dashboard", ui.composeDashboard)

module.exports = router
