const Model = require("../../models/userTypes/Model")
const User = require("../../models/User")
const Role = require("../../models/Role")
const Wallet = require("../../models/globals/wallet")
const errorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")
const ObjectId = require("mongodb").ObjectId
const generateJwt = require("../../utils/generateJwt")
const Document = require("../../models/globals/modelDocuments")

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

/**
 * contains endpoints for models registration and official works
 */

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

  const { socketId } = req.query

  let theWallet, theModel, theUserId
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()
  const approvalId = new ObjectId()
  let wasSocketUpdated = false

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
          lastLogin: new Date(),
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

      /**
       * my view is may be for some reason socketId may not be sent but,
       * because of that right user should not be devoid of registration or login
       * anyway i'am sending "wasSocketUpdated" so that if on server socket
       * was not updated we can handover this task to the client
       * their we can emit to update user info very easily
       */
      try {
        const clientSocket = io.getIO().sockets.sockets.get(socketId)
        /* add to the private room */
        clientSocket.join(`${theUser.relatedUser._id}-private`)
        /* update client info */
        clientSocket.data.userId = theUser._id
        clientSocket.data.relatedUserId = theUser.relatedUser._id
        clientSocket.authed = true
        clientSocket.userType = theUser.userType

        wasSocketUpdated = true
      } catch (error) {
        wasSocketUpdated = false
      }

      return res.status(201).json({
        message: "model registered successfully",
        actionStatus: "success",
        user: userDoc,
        model: theModel,
        // TODO: remove wallet in production, no need of wallet 🔺🔻🔻🔺
        wallet: theWallet,
        token: token,
        expiresIn: hours,
        wasSocketUpdated: wasSocketUpdated,
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

exports.handleDocumentUpload = (req, res, next) => {
  const { documentImages } = req.body

  if (req.user.relatedUser.documents) {
    Document.updateOne(
      {
        _id: req.user.relatedUser.documents,
      },
      {
        $push: { images: { $each: documentImages } },
      }
    )
      .then((result) => {
        return res.status(200).json({
          actionStatus: "success",
        })
      })
      .catch((err) => next(err))
  } else {
    Document({
      model: req.user.relatedUser._id,
      images: documentImages,
    })
      .save()
      .then((document) => {
        return Model.updateOne(
          {
            _id: req.user.relatedUser._id,
          },
          {
            documents: document._id,
          }
        )
      })
      .then((result) => {
        if (result.n === 1) {
          return res.status(200).json({
            actionStatus: "success",
          })
        }
      })
      .catch((err) => next(err))
  }
}

exports.registerTipMenuActions = (req, res, next) => {
  const { actions } = req.body

  Model.findOneAndUpdate(
    { _id: req.user.relatedUser._id },
    {
      tipMenuActions: {
        actions: actions,
        lastUpdated: new Date(),
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
