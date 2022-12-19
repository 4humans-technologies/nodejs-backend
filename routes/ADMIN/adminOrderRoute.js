const router = require("express").Router()
const orderController = require("../../controllers/ADMIN/adminOrderController")
const {
  checkForSuperAdminOrStaffWithPermission,
} = require("../../middlewares/userTypeChecker")
const tokenVerify = require("../../middlewares/tokenVerify")




  router.get(
    "/",
    tokenVerify,
    // (req, res, next) => {
    
    //   if (req.user.permissions.includes("read-Order")) {
    //     next()
    //   } else {
    //     const err = new Error(
    //       "Permission denied, you don't have permission to perform this action"
    //     )
    //     err.statusCode = 403
    //     return next(error)
    //   }
    // },
    orderController.getOrder
  )

  router.get(
    "/:id",
    tokenVerify,
    // (req, res, next) => {
    //   if (req.user.permissions.includes("read-Order")) {
    //     next()
    //   } else {
    //     const err = new Error(
    //       "Permission denied, you don't have permission to perform this action"
    //     )
    //     err.statusCode = 403
    //     return next(error)
    //   }
    // },
    orderController.getOrderById
  )

module.exports = router
