const router = require("express").Router()
const create = require("../../../../controllers/ADMIN/ra-admin/create/create")

router.post("/:resource", create)

module.exports = router
