const { generatePermissionsForModel } = require("../../utils/generatePermissions")
const Permission = require("../../models/Permission")
const Role = require("../../models/Role")

exports.createRole = (req, res, next) => {
    const idArray = req.body.ids
    const roleName = req.body.roleName

    Permission.find({
        _id: {
            $in: idArray
        }
    }, "value")
        .then(permissions => {
            if(permissions.length !== 0){
                return Role({
                    permissions: permissions.map(permission => permission.value),
                    roleName: roleName,
                    createdBy: req.user || null
                }).save()
                .then(role => {
                    res.status(201).json({
                        message: "role created successfully",
                        doc: role
                    })
                })
            }else{
                const error = new Error("permission ids are invalid")
                error.statusCode = 400
                throw error
            }
        })
        .catch(err => {
            const error = new Error(err.message || err.errMsg || "Role not created")
            error.statusCode = err.status || err.statusCode || 500
            error.data = {
                error: err
            }
            return next(err)
        })
}

exports.updateRole = (req, res, next) => {
    // TODO: also setup hook to update role in every position
    const idArray = req.body.ids
    const roleName = req.body.roleName
    const roleId = req.body.roleId
    Permission.find({
        _id: {
            $in: idArray
        }
    }, "value")
        .then(permissions => {
            return Role.updateOne(
                {
                    _id: roleId
                },
                {
                    permissions: permissions.map(permission => permission.value),
                    roleName: roleName,
                }
            )
        })
        .then(role => {
            res.status(201).json({
                message: "role updated successfully",
                doc: role
            })
        }).catch(err => {
            const error = new Error(err.message || err.errMsg || "Role not updated")
            error.statusCode = err.status || err.statusCode || 500
            error.data = {
                error: err
            }
            return next(err)
        })
}

exports.removeRole = (req, res, next) => {
    // TODO: also setup hook to update role in every position
    const roleId = req.body.roleId
    Role.deleteOne({
        _id: roleId
    }).then(role => {
        if (+role.deleteCount === 1) {
            res.status(200).json({
                message: "role removed successfully",
                doc: role
            })
        } else {
            const error = new Error("Role with this id does not exist")
            error.statusCode = 400
            throw error
        }
    }).catch(err => {
        const error = new Error(err.message || err.errMsg || "Role not removed")
        error.statusCode = err.status || err.statusCode || 500
        return next(err)
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
                doc: role
            })
        } else {
            const error = new Error("Invalid roleId provided")
            error.statusCode = 400
            throw error
        }
    }).catch(err => {
        return next(err)
    })
}

exports.getAllRoles = (req, res, next) => {
    const page = +req.query.page || 1
    const limit = +req.query.limit || 10

    Role.find({ createdAt: { $lte: new Date().toISOString() } })
    .skip((page - 1)*limit)
    .limit(limit)
    .sort("-createdAt")
    .then(roles => {
        return Role.count()
        .then(count => {
            if(roles !== null && roles.length !== 0){
                res.status(200).json({
                    message:"Fetched roles successfully",
                    docs:roles,
                    count:count,
                    pages:Math.ceil(count/limit),
                })
            }else {
                const error = new Error("Exceeded limit, this much role does not exist")
                error.statusCode = 400
                throw error
            }
        })
    }).catch(err => {
        return next(err)
    })
}