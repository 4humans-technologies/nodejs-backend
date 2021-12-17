const jwt = require("jsonwebtoken")

module.exports = (req, _res, next) => {
  const token =
    req.get("Authorization")?.split(" ")[1] || req.query?.["jwtToken"]
  /**
   * if user has no token then no problem but if he has a token
   * then decode it and do work accordingly
   */

  if (token) {
    /**
     * if has token than it should be legit, or else don't have token
     */
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
  } else {
    /**
     * if has not token, absolutely no problem, will not raise error
     */
    req.userType = "unAuthedUser"
    next()
  }
}
