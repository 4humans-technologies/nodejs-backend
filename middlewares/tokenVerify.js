const jwt = require('jsonwebtoken');
const User = require("../models/User");

module.exports = (req, _res, next) => {
    if (!req.get('Authorization')) {
        const err = new Error("No Token Found In The Header")
        err.statusCode = 403
        throw err
        // 👇👇 this will not work
        // throw new Error('Not Authenticated').statusCode = 401
    }

    const token = req.get('Authorization').split(" ")[1]
    if (!token) {
        const err = new Error("token wrongly attached")
        err.statusCode = 403
        throw err
    }

    try {
        jwt.verify(token, process.env.SECRET, (error, decodedToken) => {
            if (error) {
                if (error.message === "jwt malformed, Not Authenticated, Invalid token") {
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
                User.findById(decodedToken.userId, "role role.name permissions userType needApproval relatedUser relatedUser.username", function (err, user) {
                    if (err) {
                        return next(err)
                    } else if (user.needApproval) {
                        const error = new Error("User is not approved yet or Banned by admin, please contact the admin")
                        error.statusCode = 403
                        return next(error)
                    }
                    req.user = user
                    return next()
                })
            }
        });
    } catch (err) {
        const error = new Error(err.message || "Internal server error")
        error.statusCode = 500
        throw error
    }
}