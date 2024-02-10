const router = require("express").Router()
const updateOne = require("../../../../controllers/ADMIN/ra-admin/update/updateOne")
const adminTokenVerify = require("../../../../middlewares/adminTokenVerify")

router.put("/:resource/:id", adminTokenVerify, updateOne)

module.exports = router
