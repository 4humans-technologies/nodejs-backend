const Viewer = require("../../models/userTypes/Viewer")
const Model = require("../../models/userTypes/Model")
const User = require("../../models/User")
const Role = require("../../models/Role")
const errorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const jwtGenerator = require("../../utils/generateJwt")
const generateJwt = require("../../utils/generateJwt")


exports.loginHandler = (req, res, next) => {
    errorCollector(req, "Username of Password is incorrect, please try again!")

    const { username, password } = req.body
    let theUser;
    User.findOne({
        username: username
    })
        .populate("role", "roleName")
        .exec()
        .then(user => {
            if (!user) {
                const error = new Error("Invalid credentials  ")
                error.statusCode = 422
                throw error
            }
            theUser = user
            return bcrypt.compare(password, user.password)
        })
        .then(didMatched => {
            if (!didMatched) {
                const error = new Error("Invalid credentials")
                error.statusCode = 422
                throw error
            }

            theUser.updateLastLogin()
            const hours = 100
            res.status(200).json({
                actionStatus: "success",
                userType: theUser.userType,
                userId: theUser._id,
                relatedUserId: theUser.relatedUser._id,
                expiresIn: hours,
                token: generateJwt({
                    hours: hours,
                    userId: theUser._id,
                    relatedUserId: theUser.relatedUser._id,
                    userType: theUser.userType,
                    role: theUser.role.roleName
                })
            })
        })
        .catch(err => {
            next(err)
        })
}