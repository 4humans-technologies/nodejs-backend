const jwt = require('jsonwebtoken');

module.exports = (req, _res, next) => {
    if (!req.get('Authorization')) {
        throw new Error('Not Authenticated').statusCode = 401
    }
    const token = req.get('Authorization').split(" ")[1]
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, 'privatekey9133');
    } catch (error) {
        console.log('bycrypt err!');
        throw new Error('Server Error!').statusCode = 500
    }
    if (!decodedToken) {
        throw new Error('Not Authenticated').statusCode = 401
    }
    req.userId = decodedToken.userId
    next()
}