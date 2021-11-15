const Viewer = require("../../models/userTypes/Viewer")
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

exports.createViewer = (req, res, next) => {
  errorCollector(req, "Invalid form details, please try again")
  const { username, password, name, email, gender } = req.body

  const { socketId } = req.query

  const walletId = new ObjectId()
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()
  let wasSocketUpdated = false

  bcrypt
    .genSalt(5)
    .then((salt) => {
      return bcrypt.hash(password, salt)
    })
    .then((hashedPassword) => {
      return Promise.all([
        Wallet({
          _id: walletId,
          userType: "Viewer",
          currentAmount: 10000,
          rootUser: advRootUserId,
          relatedUser: advRelatedUserId,
        }).save({
          w: 1,
          j: false,
        }),
        Viewer({
          _id: advRelatedUserId,
          rootUser: advRootUserId,
          name: name,
          email: email,
          gender: capitalizeFirstLetter(gender),
          wallet: walletId,
        }).save({
          w: 1,
          j: false,
        }),
        User({
          _id: advRootUserId,
          username: username,
          password: hashedPassword,
          permissions: [],
          userType: "Viewer",
          relatedUser: advRelatedUserId,
          needApproval: false,
          meta: {
            lastLogin: new Date(),
          },
        }).save({
          w: 1,
          j: false,
        }),
      ])
    })
    .then((values) => {
      const hours = 12
      const user = {
        ...values[2]._doc,
        relatedUser: {
          ...values[1]._doc,
          wallet: values[0]._doc,
        },
      }

      const token = generateJwt({
        hours: hours,
        userId: user._id,
        relatedUserId: user.relatedUser._id,
        userType: user.userType,
        role: "no-role",
      })

      /**
       * my view is may be for some reason socketId may not be sent but,
       * because of that right user should not be devoid of registration or login
       * anyway i'am sending "wasSocketUpdated" so that if on server socket
       * was not updated we can handover this task to the client
       * their we can emit to update user info very easily
       */
      try {
        const clientSocket = io.getIO().sockets.sockets.get(socketId)
        clientSocket.data = { ...clientSocket?.data }
        clientSocket.data.userId = user._id
        clientSocket.data.relatedUserId = user.relatedUser._id
        clientSocket.authed = true
        clientSocket.userType = "Viewer"
        wasSocketUpdated = true
      } catch (error) {
        wasSocketUpdated = false
      }

      res.status(201).json({
        message: "viewer registered successfully",
        actionStatus: "success",
        user: user,
        token: token,
        tokenExpireIn: hours,
        wasSocketUpdated: wasSocketUpdated,
      })
    })
    .catch((err) => {
      return Promise.allSettled([
        Wallet.deleteOne({ _id: walletId }),
        Viewer.deleteOne({ _id: advRelatedUserId }),
        User.deleteOne({ _id: advRootUserId }),
      ])
        .then((deleteResult) => {
          /* error generating salt password */
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
            const error = new Error(err.message + " viewer not registered")
            error.statusCode = err.statusCode || 500
            return next(error)
          }
        })
        .catch((finalError) => next(finalError))
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
