const router = require("express").Router()
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
const package = require("../../controllers/package/packageController")

router.get("/",
  tokenVerifyWithOutPopulate,
  package.getPackage
)

module.exports = router