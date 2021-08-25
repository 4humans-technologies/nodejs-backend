const jwt = require("jsonwebtoken")

module.exports = (params) => {
    const { hours, userType, role, relatedUserId, userId } = params
    const expireIn = 60 * 60 * hours
    const token = jwt.sign({
        userId: userId.toString(),
        relatedUserId: relatedUserId.toString(),
        userType: userType,
        role: role
    },
        process.env.SECRET,
        { expiresIn: expireIn })
    return token
}