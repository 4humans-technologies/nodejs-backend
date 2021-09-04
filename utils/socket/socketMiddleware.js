const verifyTokenFunction = require("../verifyTokenFunction")

module.exports = {
    verifyToken: (client, next) => {
        try {
            if (client.handshake.auth.token !== null) {
                const { userId, relatedUserId, userType } = verifyTokenFunction(client.handshake.auth.token)
                client.data.userId = userId
                client.data.relatedUserId = relatedUserId
                client.authed = true
                client.userType = userType
            }
            client.data = null
            client.authed = null
            client.userType = "UnAuthedViewer"
            return next()
        } catch (error) {
            return next(error)
        }
    }
}