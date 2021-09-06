const router = require("express").Router()
const testController = require("../../controllers/test/test")


router.post("/pagination", testController.paginationByAggregation)

module.exports = router