const router = require("express").Router()
const { query } = require("express-validator")
const getList = require("../../../../controllers/ADMIN/ra-admin/get/getList")

router.get(
  "/:resource",
  [
    query("sort").isArray(),
    query("range").isArray(),
    query("filter").isObject(),
  ],
  getList
)

module.exports = router
