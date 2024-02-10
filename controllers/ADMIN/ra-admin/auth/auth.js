const Role = require("../../../../models/Role")
const Staff = require("../../../../models/userTypes/Staff")
const User = require("../../../../models/User")

const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

exports.loginStaff = (req, res, next) => {
  const { username, password } = req.body

  User.findOne({
    username: username,
    userType: "Staff",
  })
    .lean()
    .then((user) => {
      if (!user) {
        /**
         * no staff user found
         */
        const error = new Error("Your credentials are invalid!")
        error.statusCode = 401
        throw error
      }

      if (user.needApproval) {
        const error = new Error("You are blocked by the admin!")
        error.statusCode = 401
        throw error
      }

      if (!user.role) {
        const error = new Error(
          "Please contact admin, ERR_CODE: NO_ROLE_ALLOTED"
        )
        error.statusCode = 401
        throw error
      }

      return bcrypt.compare(password, user.password)
    })
    .then((matched) => {
      if (!matched) {
        const error = new Error("Your credentials were invalid!")
        error.statusCode = 401
        throw error
      }

      return User.findOneAndUpdate(
        {
          username: username,
        },
        { $set: { "meta.lastLogin": new Date() } }
      )
        .select("role relatedUser username userType")
        .populate([
          {
            path: "relatedUser",
            select: "name profileImage",
          },
          {
            path: "role",
            select: "roleName permissions",
          },
        ])
        .lean()
    })
    .then((user) => {
      const STAFF_JWT_EXPIRE_HOURS = 12
      const jwtToken = jwt.sign(
        {
          userId: user._id,
          username: user.username,
          staffId: user.relatedUser._id,
          role: user.role._id,
        },
        process.env.SECRET,
        { expiresIn: `${STAFF_JWT_EXPIRE_HOURS}h` }
      )
      return res.status(200).json({
        auth: { expiresIn: STAFF_JWT_EXPIRE_HOURS, jwtToken: jwtToken },
        user: user,
      })
    })
    .catch((err) => next(err))
}
