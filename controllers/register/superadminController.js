const User = require("../../models/User")
const controllerErrorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")
const Role = require("../../models/Role")
const Permission = require("../../models/Permission")
const ObjectId = require("mongodb").ObjectId
const SuperAdmin = require("../../models/userTypes/SuperAdmin")
const Wallet = require("../../models/globals/wallet")
const generateJwt = require("../../utils/generateJwt")

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

exports.createSuperAdmin = (req, res, next) => {
  controllerErrorCollector(req)

  const { username, password, name, email, phone, gender } = req.body

  const walletId = new ObjectId()
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()

  bcrypt
    .genSalt(5)
    .then((salt) => {
      return Promise.all([
        bcrypt.hash(password, salt),
        Permission.find().lean().select("value"),
      ])
    })
    .then(([hashedPassword, permissions]) => {
      return Promise.all([
        Wallet({
          _id: walletId,
          userType: "SuperAdmin",
          currentAmount: 0,
          rootUser: advRootUserId,
          relatedUser: advRelatedUserId,
        }).save(),
        SuperAdmin({
          _id: advRelatedUserId,
          rootUser: advRootUserId,
          name: name,
          email: email,
          phone: phone,
          gender: capitalizeFirstLetter(gender),
          wallet: walletId,
        }).save(),
        User({
          _id: advRootUserId,
          username: username,
          password: hashedPassword,
          permissions: permissions.map((permission) => permission.value),
          userType: "SuperAdmin",
          needApproval: true,
          relatedUser: advRelatedUserId,
          meta: {
            lastLogin: new Date(),
          },
        }).save(),
      ])
    })
    .then(([wallet, superadminbro, rootUser]) => {
      const hours = 12

      const user = {
        ...rootUser._doc,
        relatedUser: {
          ...superadminbro._doc,
          wallet: wallet._doc,
        },
      }

      const token = generateJwt({
        hours: hours,
        userId: advRootUserId,
        relatedUserId: advRelatedUserId,
        userType: rootUser.userType,
        role: "superAdmin",
      })

      return res.status(201).json({
        message: "superadmin registered successfully",
        actionStatus: "success",
        user: user,
        token: token,
        tokenExpireIn: hours,
      })
    })
    .catch((err) => {
      return Promise.allSettled([
        Wallet.deleteOne({ _id: walletId }),
        SuperAdmin.deleteOne({ _id: advRelatedUserId }),
        User.deleteOne({ _id: advRootUserId }),
      ])
        .then((deleteResult) => {
          const error = new Error(err.message + " superadmin not registered")
          error.statusCode = err.statusCode || 500
          return next(error)
        })
        .catch((finalError) => next(finalError))
    })
    .catch((finalError) => next(finalError))
}
