const router = require("express").Router()
const updateOne = require("../../../../controllers/ADMIN/ra-admin/update/updateOne")
router.put("/:resource/:id", updateOne)

module.exports = router
