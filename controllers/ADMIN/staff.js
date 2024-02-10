const Role = require("../../models/Role")
const Staff = require("../../models/userTypes/Staff")
const controllerErrorCollector = require("../../utils/controllerErrorCollector")
const throwError = require("../../utils/throwError")

exports.createStaff = (req, res, next) => {
    controllerErrorCollector(req)

    const { username, password, name, email, remark, roleId, needApproval } = req.body

    let theStaffId;
    Role.findById(roleId)
        .then(role => {
            if (role) {
                return Staff({
                    name,
                    email,
                    remark,
                    createdBy: req.user._id,
                })
                    .save({ validateBeforeSave: false })
            }
            const error = new Error("The selected role does not exist")
            error.statusCode = 422
            throw error
        })
        .then(staff => {
            theStaffId = staff._id
            return User({
                username,
                password,
                role: role.name,
                permissions: role.permissions,
                userType: "Staff",
                needApproval,
                relatedUser: staff._id
            })
        })
        .then(user => {
            return Staff.findOneAndUpdate({ _id: theStaffId })
        })
        .then(staff => {
            res.status(200).json({
                message: "Staff has been created successfully",
                actionStatus: "success"
            })
        })
        .catch(err => next(err))
}

exports.getStaff = (req, res, next) => {
    /**
     * only accessible by superAdmin or the permission to view staff
     */

    controllerErrorCollector(req)

    const { staffId } = req.body
    Staff.findById(staffId)
        .then(staff => {
            res.status(200).json({
                actionStatus: "success",
                docType: "staff",
                doc: staff
            })
        })
        .catch(err => next(err))
}

exports.getAllStaff = (req, res, next) => {
    /**
     * have to have suitable queryParams
     */

    controllerErrorCollector(req)

    const qry = {}
    paginator.withNormal(Staff, qry, select, req, res)
        .catch(err => next(err))
}

exports.removeStaff = (req, res, next) => {
    controllerErrorCollector(req)

    const { staffId } = req.body

    Staff.findById(staffId)
        .then(staff => {
            if (!staff) {
                throwError(null, {}, "Requested staff not found!", 400)
            }
            res.status(200).json({
                actionStatus: "success",
                docType: "staff",
                doc: staff
            })
        })
        .catch(err => next(err))
}