const Role = require("../../../../models/Role")
const Permission = require("../../../../models/Permission")

module.exports = (data, req) => {
  Permission.find(
    {
      _id: {
        $in: data.permissionIds,
      },
    },
    "value"
  )
    .then((permissions) => {
      if (permissions.length !== 0) {
        return Role({
          permissions: permissions.map((permission) => permission.value),
          permissionIds: data.permissionIds,
          roleName: data.name,
          createdBy: req.user._id,
        }).save()
      } else {
        const error = new Error("selected permission(s) were not found")
        error.statusCode = 400
        throw error
      }
    })
    .then((role) => {
      return {
        createdResource: [role],
        logField: "name",
        logFieldValue: role.name,
      }
    })
    .catch((err) => {
      const error = new Error("Role not created")
      error.statusCode = err.status || err.statusCode || 500
      return next(err)
    })
}
