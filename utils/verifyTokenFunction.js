const jwt = require('jsonwebtoken');

module.exports = (token) => {
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.SECRET);
    } catch (error) {
        console.log(error);
        if (error.message === "jwt malformed") {
            const err = new Error(error.message)
            err.statusCode = 401
            throw err
        } else {
            const err = new Error("Internal server error")
            err.statusCode = 500
            throw err
        }
    }
    if (!decodedToken) {
        const err = new Error("Not Authenticated, Invalid token")
        err.statusCode = 401
        throw err
    }
    return {
        userId: decodedToken.userId || null,
        relatedUserId: decodedToken.relatedUserId || null,
        userType: decodedToken.userType || null
    }
}