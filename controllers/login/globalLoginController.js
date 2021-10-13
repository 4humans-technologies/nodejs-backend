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
  /**
   * login route for Model and Viewer only
   */
  errorCollector(req, "Username of Password is incorrect, please try again!")

  const { username, password } = req.body
  let theUser
  User.findOne({
    username: username,
  })
    .select("username needApproval userType relatedUser password lastLogin")
    .populate({
      path: "relatedUser",
      select: "name pendingCall pendingCalls wallet",
      populate: {
        path: "wallet",
        select: "currentAmount",
      },
    })
    .then((user) => {
      if (!user) {
        const error = new Error("Invalid credentials, User does not exists")
        error.statusCode = 422
        throw error
      }
      theUser = user
      return bcrypt.compare(password, user.password)
    })
    .then((didMatched) => {
      if (!didMatched) {
        const error = new Error("Invalid credentials")
        error.statusCode = 422
        throw error
      }
      User.updateOne(
        { _id: theUser._id },
        { lastLogin: new Date().toISOString() }
      )
      const hours = 12
      console.debug("loggedIn")
      res.status(200).json({
        actionStatus: "success",
        userType: theUser.userType,
        rootUserId: theUser._id,
        relatedUserId: theUser.relatedUser._id,
        expiresIn: hours,
        user: theUser,
        token: generateJwt({
          hours: hours,
          userId: theUser._id,
          relatedUserId: theUser.relatedUser._id,
          userType: theUser.userType,
          role: theUser?.role?.roleName || "no-role",
        }),
      })
    })
    .catch((err) => {
      next(err)
    })
}
