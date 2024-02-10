const jwt = require("jsonwebtoken")
const Role = require("../models/Role")
module.exports = (req, _res, next) => {
  /**
   * ADMINISTRATION TOKEN ONLY
   */
  if (!req.get("Authorization")) {
    const err = new Error("No Token Found In The Header")
    err.statusCode = 403
    throw err

    /**
     * NEED THROW ERROR 🔥🔥
     * because this middleware will only be present where
     * it is required to have token in the request
     */
  }
  const token = req.get("Authorization").split(" ")[1]
  if (!token) {
    /**
     * wrong token is a clear violation, raise error
     */
    const err = new Error("token wrongly attached")
    err.statusCode = 403
    throw err
  }

  try {
    jwt.verify(token, process.env.SECRET, (error, decodedToken) => {
      if (error) {
        if (
          error.message === "jwt malformed, Not Authenticated, Invalid token"
        ) {
          const err = new Error(error.message)
          err.statusCode = 401
          throw err
        } else {
          const err = new Error("Not Authenticated, Invalid token")
          err.statusCode = 401
          throw err
        }
      }

      if (decodedToken) {
        req.user = decodedToken
        return Role.findById(req.user.role)
          .select("permissions roleName")
          .lean()
          .then((role) => {
            req.user.permissions = role.permissions
            return next()
          })
          .catch((err) => next(err))
      }
    })
  } catch (err) {
    const error = new Error(err.message || "Internal server error")
    error.statusCode = 500
    return next(error)
  }
}
