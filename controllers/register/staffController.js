const Staff = require("../../models/userTypes/Staff")
const User = require("../../models/User")
const Role = require("../../models/Role")
const ObjectId = require("mongodb").ObjectId
const bcrypt = require("bcrypt")

exports.createStaff = (req, res, next) => {
  /**
   * 🔺🔺only super admin or someone who has permission to create staff can create staff
   */
  const { name, remark, email, roleName, username, password, profileImage } =
    req.body

  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()

  bcrypt
    .genSalt(5)
    .then((salt) => {
      return Promise.all([
        bcrypt.hash(password, salt),
        Role.findOne({
          roleName: roleName,
        }).lean(),
      ])
    })
    .then((values) => {
      hashedPassword = values[0]
      role = values[1] || ["create-coupon"]
      if (role) {
        return Promise.all([
          User({
            _id: advRootUserId,
            username: username,
            password: hashedPassword,
            relatedUser: advRelatedUserId,
            permissions: role.permissions,
            userType: "Staff",
            needApproval: true /* 🔻🔻🔺🔺 */,
            meta: {
              lastLogin: new Date(),
            },
          }),
          Staff({
            _id: advRelatedUserId,
            rootUser: advRootUserId,
            name: name,
            remark: remark,
            email: email,
            profileImage: profileImage,
            createdBy: req.user._id,
          }),
        ])
      }
      return next("roleName invalid")
    })
    .then(([user, staff]) => {
      const hours = 12
      const user = {
        ...user._doc,
        relatedUser: {
          ...staff._doc,
        },
      }
      const token = generateJwt({
        hours: hours,
        userId: user._id,
        relatedUserId: staff._id,
        userType: user.userType,
        role: user.role.roleName,
      })
      res.status(201).json({
        message: "viewer registered successfully",
        actionStatus: "success",
        user: user,
        token: token,
        tokenExpireIn: hours,
      })
    })
    .catch((error) => {
      Promise.allSettled([
        Staff.deleteOne({ _id: advRelatedUserId }),
        User.deleteOne({ _id: advRootUserId }),
      ])
        .then((deleteResults) => {
          const error_default = new Error("Staff not registered")
          error_default.statusCode = 400
          throw error_default
        })
        .catch((err) => next(err))
    })
}
