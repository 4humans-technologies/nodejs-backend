const Viewer = require("../../models/userTypes/Viewer")
const User = require("../../models/User")
const Role = require("../../models/Role")
const Wallet = require("../../models/globals/wallet")
const errorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")
const ObjectId = require("mongodb").ObjectId

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

exports.createViewer = (req, res, next) => {
  errorCollector(req, "Invalid form details, please try again")

  const { username, password, name, email, gender } = req.body
  let theWallet, theViewer, theUser

  const walletId = new ObjectId()
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()

  const salt = bcrypt.genSaltSync(5)
  const hashedPassword = bcrypt.hashSync(password, salt)

  Promise.all([
    Wallet({
      userType: "Viewer",
      currentAmount: 10000,
      rootUser: advRootUserId,
      relatedUser: advRelatedUserId,
    }).save(),
    Viewer({
      _id: advRelatedUserId,
      rootUser: advRootUserId,
      name: name,
      email: email,
      gender: capitalizeFirstLetter(gender),
      wallet: walletId,
    }).save(),
    User({
      _id: advRootUserId,
      username: username,
      password: hashedPassword,
      permissions: [],
      userType: "Viewer",
      relatedUser: advRelatedUserId,
      needApproval: false,
      meta: {
        lastLogin: new Date().toISOString(),
      },
    }).save(),
  ])
    .then((values) => {
      res.status(201).json({
        message: "viewer registered successfully",
        actionStatus: "success",
        user: {
          ...values[2],
          relatedUser: {
            ...values[1],
            wallet: values[0],
          },
        },
      })
    })
    .catch((err) => {
      Promise.all([
        Wallet.deleteOne({ _id: walletId }),
        Viewer.findByIdAndRemove({ _id: advRelatedUserId }),
        User.findByIdAndRemove({ _id: advRootUserId }),
      ])
        .then((values) => {
          console.log("values >>>", values)
          const error = new Error(err.message || "viewer not registered")
          error.statusCode = err.statusCode || 500
          next(error)
        })
        .catch((_err) => {
          console.log("end error >>>", err)
          const error = new Error(err.message || "viewer not registered")
          error.statusCode = err.statusCode || 500
          next(error)
        })
    })
}

exports.updateByUser = (req, res, next) => {
  /**
   * handles when user updates profile from his dashboard
   */
  errorCollector(req, "Invalid form details, please try again")

  const { name, email, phone, gender } = req.body

  Viewer.findOneAndUpdate(
    {
      _id: req.user._id,
    },
    {
      name,
      email,
      phone,
      gender,
    }
  )
    .then((viewer) => {
      if (viewer.n >= 1) {
        res.status(200).json({
          actionStatus: "success",
          message: "Details updated successfully",
        })
      }
    })
    .catch((err) => {
      next(err)
    })
}
