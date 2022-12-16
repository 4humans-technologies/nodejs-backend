const router = require("express").Router()
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
const package = require("../../controllers/package/package")

router.get("/",
  tokenVerifyWithOutPopulate,
  package.getPackage
)

module.exports = router