const Permission = require("../../models/Permission")
const paginator = require("../../utils/paginator")
const generatePermissions = require("../../utils/generatePermissions")

exports.generateAllPermissions = (req, res, next) => {
    // if (req.user.userType === "Admin") {
    Permission.insertMany(generatePermissions.getPermissionsAtBulk(true))
        .then(allPermissions => {
            res.status(200).json({
                message: `${allPermissions.length} were created successfully`,
                actionStatus: "success",
                doc: allPermissions
            })
        })
        .catch(err => next(err))
    // res.status(401).json({
    //     message: "you are not authorized for generating all Permissions",
    //     actionStatus: "failed"
    // })
}