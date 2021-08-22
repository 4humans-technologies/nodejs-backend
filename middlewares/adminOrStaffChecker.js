module.exports = (req,_res,next) => {
    if(process.env.NODE_ENV !== "DEVELOPMENT"){
        if(req.user.userType !== "Staff" || req.user.userType !== "Superadmin"){
            const err = new Error("Permission denied, you don't have permission to perform this action")
            err.statusCode = 403
            throw err
        }
    }
    next()
}