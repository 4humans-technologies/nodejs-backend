const Permission = require("../../models/Permission")
const Role = require("../../models/Role")
const User = require("../../models/User")
const throwError = require("../../utils/throwError")

exports.createRole = (req, res, next) => {
    const idArray = req.body.ids
    const roleName = req.body.roleName

    Permission.find({
        _id: { $in: idArray }
    }, "value")
        .then(permissions => {
            if (permissions.length !== 0) {
                return Role({
                    permissions: permissions.map(permission => permission.value),
                    roleName: roleName,
                    createdBy: req.user._id
                }).save()
                    .then(role => {
                        res.status(201).json({
                            message: `Role ${roleName} was created successfully`,
                            actionStatus: "success",
                            doc: role
                        })
                    })
            } else {
                throwError(null, {}, "selected permission(s) were not found", 400)
            }
        })
        .catch(err => {
            throwError(next, err, "Role not created", 500)
        })
}

exports.updateRole = (req, res, next) => {
    // TODO: also setup hook to update role in every position

    /**
     * request should come here only if the fields are changed
    */

    const idArray = req.body.ids
    const roleName = req.body.roleName
    const roleId = req.body.roleId
    Permission.find({
        _id: {
            $in: idArray
        }
    }, "value")
        .then(permissions => {
            return Role.findOneAndUpdate(
                { _id: roleId },
                {
                    permissions: permissions.map(permission => permission.value),
                    roleName: roleName
                }
            )
        })
        .then(role => {
            /**
             * now update permissions of all the users within 
             * this role
             */
            return User.updateMany({ role: roleId }, { permissions: role.permissions })

        })
        .then(_users => {
            res.status(201).json({
                message: "Role updated successfully",
                actionStatus: "success"
            })
        }).catch(err => {
            throwError(next, err, "Role not created")
        })
}

exports.removeRole = (req, res, next) => {
    // TODO: also setup hook to update role in every position
    const roleIds = req.body.roleIds

    User.find({ role: { $in: roleIds } })
        .then(users => {
            if (!users) {
                return Role.deleteMany({ _id: { $in: roleIds } })
            }
            throwError(next, {}, "Users with selected roles still exist, Please remove the selected roles from all the users and then try again", 400)
        })
        .then(result => {
            res.status(200).json({
                message: "Selected roles were deleted successfully",
                actionStatus: "success",
                result
            })
        })
}

exports.getRole = (req, res, next) => {

    const roleId = req.params.roleId

    Role.findById({
        _id: roleId
    }).then(role => {
        if (role !== null) {
            res.status(200).json({
                message: "role fetched successfully",
                doc: role,
                docType: "Role"
            })
        } else {
            throwError(null, {}, "Invalid roleId provided")
        }
    }).catch(err => {
        return next(err)
    })
}

exports.getAllRoles = (req, res, next) => {
    /**
     * have to have suitable queryparams
     */
    controllerErrorCollector(req)
    const qry = {}
    paginator.withNormal(Role, qry, select, req, res)
        .catch(err => next(err))
}