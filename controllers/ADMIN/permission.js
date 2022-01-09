const Permission = require("../../models/Permission")
const paginator = require("../../utils/paginator")
const generatePermissions = require("../../utils/generatePermissions")

exports.generateAllPermissions = (req, res, next) => {
  Permission.insertMany(generatePermissions.getPermissionsAtBulk(true))
    .then((allPermissions) => {
      res.status(200).json({
        message: `${allPermissions.length} were created successfully`,
        actionStatus: "success",
        doc: allPermissions,
      })
    })
    .catch((err) => next(err))
}
