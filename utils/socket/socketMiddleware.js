const jwt = require("jsonwebtoken")
const Viewer = require("../../models/userTypes/Viewer")
const Model = require("../../models/userTypes/Model")

module.exports = {
  verifyToken: (client, next) => {
    // console.log("verifying token start");
    const token = client.handshake.auth.token
    if (token) {
      try {
        jwt.verify(token, process.env.SECRET, (error, decodedToken) => {
          if (error) {
            if (
              error.message ===
              "jwt malformed, Not Authenticated, Invalid token"
            ) {
              const err = new Error(error.message)
              err.statusCode = 401
              return next(err)
            } else {
              const err = new Error("Not Authenticated, Invalid token")
              err.statusCode = 401
              return next(err)
            }
          }
          if (decodedToken) {
            client.data.userId = decodedToken.userId
            client.data.relatedUserId = decodedToken.relatedUserId
            client.authed = true
            client.userType = decodedToken.userType
            return next()
          }
        })
      } catch (err) {
        const error = new Error(err.message || "Internal server error")
        error.statusCode = 500
        return next(error)
      }
    } else {
      client.data = null
      client.authed = false
      client.userType = "UnAuthedViewer"
      return next()
    }
  },
}
