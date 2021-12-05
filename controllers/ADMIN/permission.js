const Permission = require("../../models/Permission")
const paginator = require("../../utils/paginator")
const generatePermissions = require("../../utils/generatePermissions")

exports.generateAllPermissions = (req, res, next) => {
  // if (req.user.userType === "SuperAdmin") {
    Permission.insertMany(generatePermissions.getPermissionsAtBulk(true))
      .then((allPermissions) => {
        res.status(200).json({
          message: `${allPermissions.length} were created successfully`,
          actionStatus: "success",
          doc: allPermissions,
        })
      })
      .catch((err) => next(err))
//   const allPermissions = generatePermissions.getPermissionsAtBulk(true)
//   allPermissions.forEach((entry) => {
//     Permission({
//       ...entry,
//     }).save()
//   })
  // res.status(401).json({
  //     message: "you are not authorized for generating all Permissions",
  //     actionStatus: "failed"
  // })
}
