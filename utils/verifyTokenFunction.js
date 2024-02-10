const jwt = require('jsonwebtoken');

module.exports = (token) => {
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
                return {
                    userId: decodedToken.userId || null,
                    relatedUserId: decodedToken.relatedUserId || null,
                    userType: decodedToken.userType || null
                }
            }
        });
    } catch (err) {
        const error = new Error(err.message || "Internal server error")
        error.statusCode = 500
        throw error
    }
}