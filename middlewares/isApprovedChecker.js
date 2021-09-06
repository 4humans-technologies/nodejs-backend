exports.isApprovedChecker = (req, res, next) => {
    // must be after token verify
    if (req.user.needApproval) {
        const error = new Error("You are not approved to perform any action")
        error.statusCode = 401
        throw error
    }
    next()
}