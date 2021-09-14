module.exports = function throwError(next, err, msg, statusCode) {
    const error = new Error(err?.message || err?.errorMessage || msg)
    error.statusCode = err?.statusCode || statusCode
    error.actionStatus = "failed"
    if (!err?.message || err?.data) {
        error.data = err?.data || err
    }
    if (!next) {
        throw error
    }
    return next(error)
}