/**
 * verify user token in header, and dynamic select and populate for mongoose user query
 */

const jwt = require("jsonwebtoken")
const User = require("../models/User")

module.exports = (req, _res, next, select, populate) => {
  if (!select) {
    select = "role permissions userType needApproval relatedUser"
  }

  if (!populate) {
    populate = {
      path: "relatedUser",
      select: "name profileImage isChatPlanActive email",
    }
  }

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
        req.userId = decodedToken.userId
        User.findById(decodedToken.userId)
          .select(select)
          .populate(populate)
          .lean()
          .then((user) => {
            req.user = user
            next()
          })
          .catch((err) => {
            next(err)
          })
      }
    })
  } catch (err) {
    const error = new Error(err.message || "Internal server error")
    error.statusCode = 500
    next(error)
  }
}
