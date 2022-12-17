const router = require("express").Router()
const packageController = require("../../controllers/ADMIN/adminPackageController")
const {
  checkForSuperAdminOrStaffWithPermission,
} = require("../../middlewares/userTypeChecker")
const tokenVerify = require("../../middlewares/tokenVerify")

const { body } = require("express-validator")

router.post(
  "/",
  tokenVerify,
//   (req, res, next) => {
//     if (req.user.permissions.includes("create-package")) {
//       next()
//     } else {
//       const err = new Error(
//         "Permission denied, you don't have permission to perform this action"
//       )
//       err.statusCode = 403
//       return next(error)
//     }
//   },
packageController.createPackage
)

router.put(
    "/:id",
    [body("status").isString()],
    tokenVerify,
    // (req, res, next) => {
    //   if (req.user.permissions.includes("update-package")) {
    //     next()
    //   } else {
    //     const err = new Error(
    //       "Permission denied, you don't have permission to perform this action"
    //     )
    //     err.statusCode = 403
    //     return next(error)
    //   }
    // },
    packageController.updatePackage
  )
  router.get(
    "/",
    tokenVerify,
    // (req, res, next) => {
    //   if (req.user.permissions.includes("update-package")) {
    //     next()
    //   } else {
    //     const err = new Error(
    //       "Permission denied, you don't have permission to perform this action"
    //     )
    //     err.statusCode = 403
    //     return next(error)
    //   }
    // },
    packageController.packageList
  )

  router.get(
    "/:id",
    tokenVerify,
    // (req, res, next) => {
    //   if (req.user.permissions.includes("update-package")) {
    //     next()
    //   } else {
    //     const err = new Error(
    //       "Permission denied, you don't have permission to perform this action"
    //     )
    //     err.statusCode = 403
    //     return next(error)
    //   }
    // },
    packageController.getPackageById
  )

module.exports = router
