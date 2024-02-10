const router = require("express").Router()
const getOne = require("../../../../controllers/ADMIN/ra-admin/get/getOne")
const adminTokenVerify = require("../../../../middlewares/adminTokenVerify")

router.get("/:resource/:id", adminTokenVerify, getOne)

module.exports = router
