const jwt = require('jsonwebtoken');
const User = require("../models/User");

module.exports = (req, _res, next) => {
    // if(process.env.NODE_ENV === "DEVELOPMENT"){
    //     return next()
    // }
    if (!req.get('Authorization')) {
        const err = new Error("Not Authenticated")
        err.statusCode = 403
        throw err

        // 👇👇 this will not work
        // throw new Error('Not Authenticated').statusCode = 401
    }
    const token = req.get('Authorization').split(" ")[1]
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.SECRET);
    } catch (error) {
        console.log(error);
        if (error.message === "jwt malformed") {
            const err = new Error(error.message)
            err.statusCode = 401
            return next(err)
        } else {
            const err = new Error("Internal server error")
            err.statusCode = 500
            return next(err)
        }
    }
    if (!decodedToken) {
        const err = new Error("Not Authenticated, Invalid token")
        err.statusCode = 401
        throw err
    }
    req.userId = decodedToken.userId
    User.findById(decodedToken.userId, function (err, user) {
        if (err) {
            return next(err)
        } else if (user.needApproval) {
            const error = new Error("User is not approved yet or Banned by admin")
            error.statusCode = 403
            return next(error)
        }
        req.user = user
        return next()
    })
}