const ObjectId = require("mongodb").ObjectId
const bcrypt = require("bcrypt")

exports.createStaff = (Staff, req, res, next, options) => {
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()

  const { rootUser, ...staff } = req.body

  const Role = options.requiredModels.Role
  const User = options.requiredModels.User

  let roleName
  return Role.findOne({
    _id: req.body.rootUser.role,
  })
    .lean()
    .then((role) => {
      roleName = role.roleName
      const combinedPermission = role.permissions
      return Promise.all([
        Staff({
          _id: advRelatedUserId,
          rootUser: advRootUserId,
          createdBy: req.user.userId,
          ...staff,
        }).save(),
        User({
          _id: advRootUserId,
          relatedUser: advRelatedUserId,
          permissions: Array.from(combinedPermission),
          userType: "Staff",
          ...rootUser,
        }).save(),
      ])
    })
    .then(([staff, rootUser]) => {
      const user = {
        ...rootUser._doc,
        role: roleName,
        relatedUser: {
          ...staff._doc,
        },
      }
      return {
        createdResource: user,
        logMsg: `Staff @${user.username} was created ${
          !user.needApproval ? "& verified" : ""
        } with role ${roleName} by ${req.user.username}`,
      }
    })
    .catch((err) => {
      return Promise.allSettled([
        Staff.deleteOne({ _id: advRelatedUserId }),
        User.deleteOne({ _id: advRootUserId }),
      ]).finally(() => {
        const error = new Error(err.message + ", staff not registered")
        error.statusCode = err.statusCode || 500
        throw error
      })
    })
}

exports.createRole = (Role, req, res, next, options) => {
  const Permission = options.requiredModels.Permission

  const data = req.body

  return Permission.find({
    _id: { $in: data.permissions },
  })
    .lean()
    .select("value")
    .then((permissions) => {
      return Role({
        permissions: permissions.map((p) => p.value),
        permissionIds: permissions.map((p) => p._id),
        roleName: data.roleName,
        createdBy: req.user.userId,
      }).save()
    })
    .then((role) => {
      return {
        createdResource: role,
        logMsg: `Role ${role.roleName} was created, with ${data.permissions.length} permissions`,
      }
    })
}
