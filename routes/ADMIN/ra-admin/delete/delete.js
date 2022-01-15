const router = require("express").Router()
const deleteOne = require("../../../../controllers/ADMIN/ra-admin/delete/deleteOne")
const deleteMany = require("../../../../controllers/ADMIN/ra-admin/delete/deleteMany")

router.delete("/:resource/:id", deleteOne)
router.delete("/:resource", deleteMany)

module.exports = router
