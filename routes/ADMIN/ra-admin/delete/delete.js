const router = require("express").Router()
const deleteOne = require("../../../../controllers/ADMIN/ra-admin/delete/deleteOne")
const deleteMany = require("../../../../controllers/ADMIN/ra-admin/delete/deleteMany")
const adminTokenVerify = require("../../../../middlewares/adminTokenVerify")

router.delete("/:resource/:id", adminTokenVerify, deleteOne)
router.delete("/:resource", adminTokenVerify, deleteMany)

module.exports = router
