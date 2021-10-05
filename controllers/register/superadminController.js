const User = require("../../models/User");
const controllerErrorCollector = require("../../utils/controllerErrorCollector");
const bcrypt = require("bcrypt");
const Role = require("../../models/Role");
const SuperAdmin = require("../../models/userTypes/SuperAdmin");

exports.createSuperAdmin = (req, res, next) => {
    controllerErrorCollector(req)

    const { username, password, name, email, phone, gender } = req.body

    let theAdmin, theUser
    SuperAdmin({
        name: name,
        email: email,
        phone: phone,
        gender: gender
    })
        .save({ validateBeforeSave: false })
        .then(admin => {
            theAdmin = admin
            // all role name are in lowercase
            return Role.findOne({ roleName: "pending-admin" })
        })
        .then(role => {
            console.log("role >>> ", role)
            if(role !== null){
                const salt = bcrypt.genSaltSync(5)
                return User({
                    username: username,
                    password: bcrypt.hashSync(password, salt),
                    permissions: role.permissions,
                    role: role,
                    userType: "SuperAdmin",
                    relatedUser: theAdmin,
                    // this should be false
                    needApproval: true,
                }).save()
            }else{
                const error = new Error("pending-admin role not found, this role is mandatory")
                throw error
            }
        })
        .then(user => {
            theUser = user
            return theAdmin.updateOne({ rootUser: user })
            // theAdmin.rootUser = user
            // return theAdmin.save()
        })
        .then(admin => {
            res.status(200).json({
                actionStatus: "success",
                superadmin: admin,
                user: theUser
            })
        }).catch(err => {
            try {
                // if registeration failed delete all the models created
                theAdmin.remove(function (err, doc) {
                    console.log("admin removed ", doc);
                })
                theUser.remove(function (err, doc) {
                    console.log("user removed ", doc);
                })
            } catch (error) {
                console.log("try error >>>", error.message);
            }
            next(err)
        })
}