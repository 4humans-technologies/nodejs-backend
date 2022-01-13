const ObjectId = require("mongodb").ObjectId
const bcrypt = require("bcrypt")

exports.createStaff = (Staff, req, res, next, options) => {
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()

  const { username, password, name, email, phone, remark, profileImage } =
    req.body

  const Role = options.requiredModels.Role
  const User = options.requiredModels.User

  bcrypt
    .genSalt(5)
    .then((salt) => {
      return Promise.all([
        bcrypt.hash(password, salt),
        Role.find({
          roleName: { $in: req.body.rootUser.roles },
        }).lean(),
      ])
    })
    .then(([hashedPassword, roles]) => {
      const combinedPermission = new Set()
      roles.forEach((role) => {
        role.forEach((permission) => {
          combinedPermission.add(permission)
        })
      })
      return Promise.all([
        Staff({
          _id: advRelatedUserId,
          rootUser: advRootUserId,
          name: name,
          email: email,
          phone: String(phone),
          remark: remark,
          profileImage: profileImage,
        }).save(),
        User({
          _id: advRootUserId,
          username: username,
          password: hashedPassword,
          permissions: Array.from(combinedPermission),
          userType: "Staff",
          needApproval: true,
          relatedUser: advRelatedUserId,
        }).save(),
      ])
    })
    .then(([staff, rootUser]) => {
      const user = {
        ...rootUser._doc,
        relatedUser: {
          ...staff._doc,
        },
      }
      return res.status(200).json(user)
    })
    .catch((err) => {
      return Promise.allSettled([
        Staff.deleteOne({ _id: advRelatedUserId }),
        User.deleteOne({ _id: advRootUserId }),
      ])
        .then(() => {
          const error = new Error(err.message + ", staff not registered")
          error.statusCode = err.statusCode || 500
          throw error
        })
        .catch((finalError) => next(finalError))
    })
}
