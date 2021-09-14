const Permission = require("../../models/Permission")
const generateCode = require("../../utils/generateCode")
const { generatePermissionsForModel } = require("../../utils/generatePermissions")


exports.getPermissions = (req, res, next) => {
    const id = req.params.id
    Permission.findById(id)
        .then(permission => {
            return res.status(200).json({
                doc: permission
            })
        }).catch(err => {
            next(err)
        })
}

exports.createPermission = (req, res, next) => {
    const value = req.body.value
    Permission({
        value: value,
        code: generateCode(value)
    })
        .save()
        .then(doc => {
            res.status(201).json({
                message: "permission created",
                doc: doc
            })
        }).catch(err => {
            next(err)
        })
}

exports.removePermission = (req, res, next) => {
    const id = req.body.id
    Permission.deleteOne({ _id: id }, function (err, doc) {
        if (err) {
            throw err
        } else {
            return res.status(204).json({
                message: "deleted successfully",
            })
        }
    })
}

exports.getAllPermissions = (req, res, next) => {
    const page = parseInt(req.query[page] || 1)
    const limit = parseInt(req.query[limit] || 10)

    Permission.findById({
        createdAt: {
            $lte: new Date().getTime()
        }
    })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort("-createdAt")
        .then(docs => {
            res.status(200).json({
                docs: docs
            })
        }).catch(err => {
            if (!err.statusCode) {
                err.statusCode = 401
            }
            next(err)
        })
}

// ================ PERMISSION GENERATION ==================

exports.generateAllPermissions = (req, res, next) => {

}

exports.generatePermissionsFor = (req, res, next) => {
    generatePermissionsForModel(req.body.modelName)
        .then(docs => {
            console.log("permissions generated");
            res.status(201).json({
                message: 'Permissions inserted successfully',
                actionStatus: "success",
                docs: docs
            })
        }).catch(error => {
            const err = new Error("Permissions NOT inserted")
            err.statusCode = error.status || error.statusCode || 500
            err.data = {
                message: 'Permissions NOT inserted',
                actionStatus: "failed",
                error: error
            }
            next(err)
        })
}