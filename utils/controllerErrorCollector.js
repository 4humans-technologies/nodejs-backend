const { validationResult } = require('express-validator')

module.exports = (req,errorMsg,statusCode) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error(errorMsg || "Incorrect parameters given, please check again")
        error.statusCode = statusCode || 422
        error.data = errors.array()
        throw error
    }
}