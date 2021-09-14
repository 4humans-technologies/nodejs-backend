const Model = require("../../models/userTypes/Model")
const User = require("../../models/User")
const Role = require("../../models/Role")
const Wallet = require("../../models/globals/wallet")
const errorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")

exports.createModel = (req, res, next) => {

    errorCollector(req, "Invalid form details, please try again")

    const { username, password, name, screenName, email, phone, gender, DOB } = req.body
    let theWallet, theModel, theUser;

     
    Wallet({
        userType: "Model",
        currentAmount: 0
    })
        .save({ validateBeforeSave: false })
        .then(wallet => {
            theWallet = wallet
            return Model({
                name: name,
                screenName: screenName,
                gender: gender,
                email: email,
                phone: phone,
                dob: DOB,
                wallet: wallet
            }).save({ validateBeforeSave: false })
        })
        .then(model => {
            theModel = model
            const salt = bcrypt.genSaltSync(5)
            const hashedPassword = bcrypt.hashSync(password, salt)
            return User({
                username: username,
                password: hashedPassword,
                permissions: role.permissions,
                role: role,
                userType: "model",
                relatedUser: theModel,
                needApproval: true,
                meta: {
                    lastLogin: new Date().toISOString()
                }
            }).save()
        })
        .then(userDoc => {
            theUser = userDoc

            theWallet.rootUser = userDoc._id
            theWallet.relatedUser = theModel._id
            theModel.rootUser = userDoc._id
            return Promise.all([theWallet.save(), theModel.save()])
        })
        .then(values => {
            res.status(201).json({
                message: "model registered successfully",
                actionStatus: "success",
                user: theUser,
                model: values[1],
                // TODO: remove wallet in production
                wallet: values[0]
            })
        })
        .catch(err => {
            try {
                // if registration failed delete all the models created
                theWallet.remove(function (err, doc) {
                    console.log("wallet removed ", doc);
                })
                theModel.remove(function (err, doc) {
                    console.log("model removed ", doc);
                })
                theUser.remove(function (err, doc) {
                    console.log("user removed ", doc);
                })
            } catch (error) {
                console.log("try error >>>", error.message);
            }
            console.log("end error >>>", err)
            const error = new Error(err.message || "model not registered")
            error.statusCode = err.statusCode || 500
            next(error)
        })
}