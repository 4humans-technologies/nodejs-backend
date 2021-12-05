const Viewer = require("../../models/userTypes/Viewer")
const User = require("../../models/User")
const Role = require("../../models/Role")
const Wallet = require("../../models/globals/wallet")
const errorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")
const ObjectId = require("mongodb").ObjectId
const {
  generateEmailConformationJWT,
} = require("../../utils/generateEmailConformationJWT")
const generateJwt = require("../../utils/generateJwt")
const io = require("../../socket")
const chatEventListeners = require("../../utils/socket/chat/chatEventListeners")
const { sendViewerEmailConformation } = require("../../sendgrid")

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

exports.createViewer = (req, res, next) => {
  errorCollector(req, "Invalid form details, please try again")
  const { username, password, name, email, gender, profileImage } = req.body

  const { socketId } = req.query

  const walletId = new ObjectId()
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()
  let wasSocketUpdated = false

  /* 🥇🥇 */
  const DEFAULT_SIGNUP_WALLET_AMOUNT_FOR_VIEWER =
    +process.env.DEFAULT_SIGNUP_WALLET_AMOUNT_FOR_VIEWER

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
          currentAmount: DEFAULT_SIGNUP_WALLET_AMOUNT_FOR_VIEWER,
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
          profileImage: profileImage,
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
            lastLogin: new Date(),
          },
          inProcessDetails: {
            emailVerified: false,
          },
        }).save(),
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

      let wasEmailSent = false
      const emailToken = generateEmailConformationJWT({
        userId: user._id.toString(),
        relatedUserId: user.relatedUser._id.toString(),
        userType: user.userType,
      })

      /* send conformation email */
      try {
        sendViewerEmailConformation({
          to: email,
          dynamic_template_data: {
            confirm_url: `${
              process.env.FRONTEND_URL.includes("localhost") ? "http" : "https"
            }://${
              process.env.FRONTEND_URL
            }/link-verification/email?token=${emailToken}`,
            first_name: name.split(" ")[0],
            free_coins_amt:
              process.env.DEFAULT_EMAIL_CONFORMATION_WALLET_AMOUNT_FOR_VIEWER,
            confirm_before:
              +process.env.EMAIL_CONFORMATION_EXPIRY_HOURS_VIEWER / 24,
          },
        })
        wasEmailSent = true
      } catch (error) {
        wasEmailSent = false
      }

      /**
       * my view is may be for some reason socketId may not be sent but,
       * because of that right user should not be devoid of registration or login
       * anyway i'am sending "wasSocketUpdated" so that if on server socket
       * was not updated we can handover this task to the client
       * their we can emit to update user info very easily
       */
      try {
        const clientSocket = io.getIO().sockets.sockets.get(socketId)
        clientSocket.removeAllListeners(
          chatEventListeners.unAuthedViewerEventList
        )
        chatEventListeners.authedViewerListeners(clientSocket)
        clientSocket.data = {
          ...clientSocket.data,
          userId: user._id.toString(),
          relatedUserId: user.relatedUser._id.toString(),
        }
        clientSocket.join(`${user.relatedUser._id}-private`)
        clientSocket.authed = true
        clientSocket.userType = "Viewer"
        wasSocketUpdated = true
      } catch (error) {
        wasSocketUpdated = false
      }

      return res.status(201).json({
        message: "viewer registered successfully",
        actionStatus: "success",
        user: user,
        token: token,
        expiresIn: hours,
        wasSocketUpdated: wasSocketUpdated,
        freeCoins:
          +process.env.DEFAULT_EMAIL_CONFORMATION_WALLET_AMOUNT_FOR_VIEWER,
      })
    })
    .catch((err) => {
      return Promise.allSettled([
        Wallet.deleteOne({ _id: walletId }),
        Viewer.deleteOne({ _id: advRelatedUserId }),
        User.deleteOne({ _id: advRootUserId }),
      ])
        .then((_deleteResult) => {
          /* error generating salt password */
          if (err?.name === "MongoError") {
            switch (err.code) {
              case 11000: {
                const field = Object.keys(err.keyValue)[0]
                const fieldValue = err.keyValue[field]
                const errMessage = `${field} "${fieldValue}", is already used.`
                const error = new Error(errMessage)
                error.statusCode = 400
                throw error
              }
              default: {
                const error_default = new Error(
                  err.message || "viewer not registered"
                )
                error_default.statusCode = err.statusCode || 500
                throw error_default
              }
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
