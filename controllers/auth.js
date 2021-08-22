const User = require("../models/User")
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken')

const saveUser = (userType) => {

}

exports.viewerSignupHandler = (req, res, next) => {
    const username = req.body.username
    const screenName = req.body.screenName
    const password = req.body.password
    const conformation = req.body.conformation
    const email = req.body.email
    const phone = req.body.phone
    const gender = req.body.gender


    new User({
        username: username,
        password: password,
        userType: "viewer",

    })
        .save()
        .then(savedDoc => {
            console.log("response");
            // console.log(savedDoc);
            res.json({
                doc: savedDoc
            })
        }).catch(err => {
            console.log(err);
        })
}

exports.modelSignupHandler = (req, res, next) => {

}

exports.adminSignupHandler = (req, res, next) => {

}

exports.loginHandler = (req, res, next) => {
    const password = req.body.password
    const username = req.body.username
    let theUser;

    User.findOne({
        username: username,
    }).then(user => {
        if (!user) {
            const err = new Error("User do not exist")
            err.statusCode = 401
            throw err
        }
        theUser = user
        return bcrypt.compare(password, user.password)
    }).then(didMatched => {
        if (!didMatched) {
            const err = new Error("Wrong credentials")
            err.statusCode = 401
            throw err
        } else {
            const hours = 1
            const expireIn = 60 * 60 * hours
            const token = jwt.sign({
                username: username,
                userId: theUser._id.toString()
            },
                process.env.SECRET,
                { expiresIn: expireIn })
            res.status(200).json({
                message: "Logged in successfully",
                token: token,
                expireIn: expireIn
            })
        }
    })
}