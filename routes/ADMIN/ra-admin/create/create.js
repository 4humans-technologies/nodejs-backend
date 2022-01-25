const router = require("express").Router()
const create = require("../../../../controllers/ADMIN/ra-admin/create/create")
const adminTokenVerify = require("../../../../middlewares/adminTokenVerify")

router.post("/:resource", adminTokenVerify, create)

module.exports = router
