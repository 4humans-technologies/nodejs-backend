const Viewer = require("../../models/userTypes/Viewer")
const User = require("../../models/User")
const Role = require("../../models/Role")
const Wallet = require("../../models/globals/wallet")
const errorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")

exports.createViewer = (req, res, next) => {
    errorCollector(req, "Invalid form details, please try again")

    const { username, password, name, screenName, email, phone, gender } = req.body
    let theWallet, theViewer, theUser;

    Wallet({
        userType: "Viewer",
        currentAmount: 0
    })
        .save({ validateBeforeSave: false })
        .then(wallet => {
            theWallet = wallet
            return Viewer({
                name: name,
                email: email,
                phone: phone,
                gender: gender,
                screenName: screenName,
                wallet: wallet
            }).save({ validateBeforeSave: false })
        })
        .then(viewer => {
            theViewer = viewer
            return Role.findOne({ roleName: "viewer" })
        })
        .then(role => {
            if (role !== null) {
                const salt = bcrypt.genSaltSync(5)
                const hashedPassword = bcrypt.hashSync(password, salt)
                return User({
                    username: username,
                    password: hashedPassword,
                    permissions: role.permissions,
                    role: role,
                    userType: "Viewer",
                    relatedUser: theViewer,
                    needApproval:false,
                    meta: {
                        lastLogin: new Date().toISOString()
                    }
                }).save()
            } else {
                const error = new Error("viewer role not set, A role with name viewer is required, admin has has deleted it by mistake")
                error.statusCode = 500
                throw error
            }
        })
        .then(userDoc => {
            theUser = userDoc

            theWallet.rootUser = userDoc._id
            theWallet.relatedUser = theViewer._id
            theViewer.rootUser = userDoc._id
            return Promise.all([theWallet.save(), theViewer.save()])
        })
        .then(values => {
            res.status(201).json({
                message: "viewer registered successfully",
                actionStatus: "success",
                user: theUser,
                viewer: values[1],
                // TODO: remove wallet in production
                wallet: values[0]
            })
        })
        .catch(err => {
            try {
                // if registeration failed delete all the models created
                theWallet.remove(function (err, doc) {
                    console.log("wallet removed ", doc);
                })
                theViewer.remove(function (err, doc) {
                    console.log("viewer removed ", doc);
                })
                theUser.remove(function (err, doc) {
                    console.log("viewer removed ", doc);
                })
            } catch (error) {
                console.log("try error >>>", error.message);
            }
            console.log("end error >>>", err)
            const error = new Error(err.message || "viewer not registered")
            error.statusCode = err.statusCode || 500
            next(error)
        })
}

exports.updateByUser = (req, res, next) => {
    errorCollector(req, "Invalid form details, please try again")

    const { name, screenName, email, phone, gender } = req.body

    Viewer.findOneAndUpdate({
        _id: req.user._id
    }, {
        name,
        screenName,
        email,
        phone,
        gender
    })
        .then(viewer => {
            if (viewer.n >= 1) {
                res.status(200).json({
                    actionStatus: "success",
                    message: "Details updated successfully"
                })
            }
        }).catch(err => {
            next(err)
        })
}