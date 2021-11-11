const Model = require("../../models/userTypes/Model")
const User = require("../../models/User")
const Role = require("../../models/Role")
const Wallet = require("../../models/globals/wallet")
const errorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")
const ObjectId = require("mongodb").ObjectId
const generateJwt = require("../../utils/generateJwt")

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

exports.createModel = (req, res, next) => {
  errorCollector(req, "Invalid form details, please try again")
  const {
    username,
    password,
    name,
    email,
    phone,
    gender,
    age,
    languages,
    profileImage,
  } = req.body

  let theWallet, theModel, theUserId
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()
  const approvalId = new ObjectId()
  Wallet({
    userType: "Model",
    currentAmount: 0,
    rootUser: advRootUserId,
    relatedUser: advRelatedUserId,
  })
    .save()
    .then((wallet) => {
      theWallet = wallet
      return Model({
        _id: advRelatedUserId,
        rootUser: advRootUserId,
        approval: approvalId,
        name: name,
        gender: capitalizeFirstLetter(gender),
        email: email,
        phone: phone,
        dob: new Date().getFullYear() - age,
        wallet: wallet._id,
        // profileImage: "/" + req.file.path.replace(/\\/g, "/"),
        profileImage: profileImage,
        languages: languages.split(",") || ["hindi"],
      }).save()
    })
    .then((model) => {
      theModel = model
      const salt = bcrypt.genSaltSync(5)
      const hashedPassword = bcrypt.hashSync(password, salt)
      return User({
        _id: advRootUserId,
        username: username,
        password: hashedPassword,
        permissions: [],
        userType: "Model",
        relatedUser: advRelatedUserId,
        needApproval: false, //🔴🔴 set to false only for testing
        meta: {
          lastLogin: new Date().toISOString(),
        },
      }).save()
    })
    .then((userDoc) => {
      theUserId = userDoc._id
      const hours = 12
      const token = generateJwt({
        hours: hours,
        userId: theUserId,
        relatedUserId: userDoc.relatedUser._id,
        userType: userDoc.userType,
        role: userDoc?.role?.roleName || "no-role",
      })
      res.status(201).json({
        message: "model registered successfully",
        actionStatus: "success",
        user: userDoc,
        model: theModel,
        // TODO: remove wallet in production, no need of wallet 🔺🔻🔻🔺
        wallet: theWallet,
        token: token,
        expiresIn: hours,
      })
    })
    .catch((err) => {
      Promise.allSettled([
        Wallet.deleteOne({
          _id: theWallet._id,
        }),
        Model.deleteOne({
          _id: advRelatedUserId,
        }),
        User.deleteOne({
          _id: advRootUserId,
        }),
      ])
        .then((results) => {
          if (err?.name === "MongoError") {
            switch (err.code) {
              case 11000:
                const field = Object.keys(err.keyValue)[0]
                const fieldValue = err.keyValue[field]
                errMessage = `${field} "${fieldValue}", is already used.`
                const error = new Error(errMessage)
                error.statusCode = 400
                throw error
              default:
                const error_default = new Error(
                  err.message || "viewer not registered"
                )
                error_default.statusCode = err.statusCode || 500
                throw error_default
            }
          } else {
            const error = new Error(err.message || "Model was not registered")
            error.statusCode = err.statusCode || 400
            error.data = {
              code: err.code,
            }
            throw error
          }
        })
        .catch((finalError) => next(finalError))
    })
}

exports.handleDocumentUpload = (req, res, next) => {}

exports.registerTipMenuActions = (req, res, next) => {
  const { actions } = req.body

  Model.findOneAndUpdate(
    { _id: req.user.relatedUser._id },
    {
      tipMenuActions: {
        actions: actions,
        lastUpdated: new Date().toISOString(),
      },
    },
    { new: true }
  )
    .select("tipMenuActions")
    .then((model) => {
      res.status(200).json({
        actionStatus: "actions registered successfully!",
        tipMenuActions: tipMenuActions,
      })
    })
    .catch((error) => next(error))
}
