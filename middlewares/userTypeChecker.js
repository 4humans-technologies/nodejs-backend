exports.checkForViewer = (req, res, next) => {
  if (process.env.NODE_ENV === "DEVELOPMENT") {
    return next()
  }
  const permissions = [
    "read-user",
    "update-user",
    "delete-user",
    "read-wallet",
    "read-model",
    "read-stream",
    "read-giftpurchase",
    "create-giftpurchase",
    "read-coinpurchase",
    "create-coinpurchase",
    "read-gifts",
  ]
  if (req.user.userType !== "Viewer") {
    const error = new Error("You are not allowed to access this route")
    error.statusCode = 403
    return next(error)
  }
  next()
}

exports.checkForModel = (req, res, next) => {
  if (process.env.NODE_ENV === "DEVELOPMENT") {
    return next()
  }
  const permissions = ["read-model", "update-user", "delete-user"]
  if (req.user.userType !== "Model") {
    const error = new Error("You are not allowed to access this route")
    error.statusCode = 403
    return next(error)
  }
  next()
}

exports.checkForStaff = (req, res, next) => {
  if (process.env.NODE_ENV === "DEVELOPMENT") {
    return next()
  }
  if (req.user.userType !== "Staff") {
    const error = new Error("You are not allowed to access this route")
    error.statusCode = 403
    return next(error)
  }
  next()
}

exports.checkForSuperAdminOrStaff = (req, _res, next) => {
  if (process.env.NODE_ENV === "DEVELOPMENT") {
    return next()
  }
  if (req.user.userType !== "Staff" || req.user.userType !== "Superadmin") {
    const err = new Error(
      "Permission denied, you don't have permission to perform this action"
    )
    err.statusCode = 403
    return next(error)
  }
  next()
}
exports.checkForSuperAdminOrStaffWithPermission = (
  req,
  _res,
  next,
  permissionsList
) => {
  if (req.user.userType !== "Staff" || req.user.userType !== "Superadmin") {
    const err = new Error(
      "Permission denied, you don't have permission to perform this action"
    )
    err.statusCode = 403
    return next(error)
  }

  if (
    permissionsList.every((permission) =>
      req.user.permissions.includes(permission)
    )
  ) {
    /* proceed */
    return next()
  } else {
    /* does not have permission */
    const err = new Error(
      "Permission denied, you don't have permission to perform this action"
    )
    err.statusCode = 403
    return next(error)
  }
}
