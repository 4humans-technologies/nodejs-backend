const jwt = require("jsonwebtoken")

module.exports = (req, _res, next) => {
  if (!req.get("Authorization") && !req.query?.["jwtToken"]) {
    const err = new Error("No Token Found In The Header")
    err.statusCode = 403
    throw err

    /**
     * NEED THROW ERROR 🔥🔥
     * because this middleware will only be present where
     * it is required to have token in the request
     */
  }
  const token = req.get("Authorization").split(" ")[1] || req.query["jwtToken"]
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
        req.user = { relatedUser: {} }
        req.user._id = decodedToken.userId
        req.user.relatedUser._id = decodedToken.relatedUserId
        req.user.userType = decodedToken.userType
        next()
      }
    })
  } catch (err) {
    const error = new Error(err.message || "Internal server error")
    error.statusCode = 500
    next(error)
  }
}
