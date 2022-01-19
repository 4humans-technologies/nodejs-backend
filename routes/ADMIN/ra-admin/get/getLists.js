const router = require("express").Router()
const { query } = require("express-validator")
const getList = require("../../../../controllers/ADMIN/ra-admin/get/getList")
const getMany = require("../../../../controllers/ADMIN/ra-admin/get/getMany")

router.get(
  "/:resource",
  [
    query("sort").isArray(),
    query("range").isArray(),
    query("filter").isObject(),
  ],
  (req, res, next) => {
    const contentRange = req.get("range")
    if (contentRange) {
      return getList(req, res, next)
    } else {
      return getMany(req, res, next)
    }
  }
)

module.exports = router
