const router = require("express").Router()
const getOne = require("../../../../controllers/ADMIN/ra-admin/get/getOne")

router.get("/:resource/:id", getOne)

module.exports = router
