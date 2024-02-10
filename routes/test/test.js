const router = require("express").Router()
const testController = require("../../controllers/test/test")


router.get("/pagination", testController.paginationByAggregation)

module.exports = router