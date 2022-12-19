const router = require("express").Router()
const tokenVerifyWithOutPopulate = require("../../middlewares/tokenVerifyWithOutPopulate")
const order = require("../../controllers/order/orderController")

router.get("/",
  tokenVerifyWithOutPopulate,
  order.getOrder
)

router.get("/:id",
  tokenVerifyWithOutPopulate,
  order.getOrderById
)

module.exports = router