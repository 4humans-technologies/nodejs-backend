const User = require("../models/User")

exports.signupHandler = (req,res,next) => {
    const password = req.body.password
    const username = req.body.username

    new User({
        username:username,
        password:password,
        userType:"viewer"
    })
    .save()
    .then(savedDoc => {
        console.log("response");
        // console.log(savedDoc);
        res.json({
            doc:savedDoc
        })
    }).catch(err => {
        console.log(err);
    })
}