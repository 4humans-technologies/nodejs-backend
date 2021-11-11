const Model = require("../../models/userTypes/Model")
const User = require("../../models/User")
const bcrypt = require("bcrypt")
const Approval = require("../../models/management/approval")

exports.getModelProfileData = (req, res, next) => {
  Model.findById(req.user.relatedUser._id)
    .populate("rootUser")
    .populate("approval")
    .populate("adminPriceRange")
    .populate("currentStream")
    // .populate("stream")
    .populate("videoCallHistory")
    .populate("audioCallHistory")
    .populate("pendingCalls.audioCalls")
    .populate("pendingCalls.videoCalls")
    .populate("Tags")
    .populate("wallet")
    .select("-streams ")
    .then((model) => {
      res.status(200).json({
        actionStatus: "success",
        model: model,
      })
    })
    .catch((err) => next(err))
}

exports.updateTipMenuActions = (req, res, next) => {
  /* will replace previous actions with the new ones, no merging */
  const { newActions } = req.body
  const { socketId } = req.query
  let { onStream } = req.body
  if (typeof onStream === "undefined") {
    onStream = false
  }

  Model.findById(req.user.relatedUser._id)
    .select("tipMenuActions")
    .then((model) => {
      if (newActions.length !== 0) {
        model.tipMenuActions = {
          actions: newActions,
          lastUpdated: new Date().toISOString(),
        }
      }
      return model.save()
    })
    .then((model) => {
      if (model) {
        res.status(200).json({
          actionStatus: "success",
        })
      }
    })
    .catch((err) => next(err))
}

exports.getCallHistory = (req, res, next) => {}

exports.updateCallChargesAndMinDuration = (req, res, next) => {
  /*  */
  const { charges, minCallDuration } = req.body

  Model.findById(req.user.relatedUser._id)
    .select("charges minCallDuration")
    .then((model) => {
      model.charges = charges
      model.minCallDuration = +minCallDuration
      return model.save()
    })
    .then((model) => {
      return res.status(200).json({
        actionStatus: "success",
      })
    })
    .then((err) => next(err))
}

exports.updateEmail = (req, res, next) => {
  const { newEmail, prevPassword } = req.body
}

exports.updatePassword = (req, res, next) => {
  const { newPassword, prevPassword } = req.body

  let theUser
  User.findById(req.user._id)
    .select("password")
    .then((user) => {
      theUser = user
      return bcrypt.compare(user.password, prevPassword)
    })
    .then((didMatched) => {
      if (didMatched) {
        return bcrypt.genSalt(5)
      } else {
        const error = new Error("Invalid credentials")
        error.statusCode = 422
        throw error
      }
    })
    .then((salt) => {
      return bcrypt.hash(newPassword, salt)
    })
    .then((hashedPassword) => {
      theUser.password = hashedPassword
      return theUser.save()
    })
    .then((user) => {
      res.status(200).json({
        actionStatus: "success",
      })
    })
    .catch((err) => next(error))
}

exports.updateModelBasicDetails = (req, res, next) => {
  const { updatedData } = req.body

  const userData = {}

  if (updatedData?.username) {
    userData[username] = updatedData.username
  }

  const queryArray = updatedData?.userName
    ? [
        Model.findByIdAndUpdate(
          req.user.relatedUser._id,
          {
            ...updatedData,
          },
          {
            runValidators: true,
          }
        ).lean(),
        User.findByIdAndUpdate(req.user._id, {
          ...userData,
        }).lean(),
      ]
    : [
        Model.findByIdAndUpdate(
          req.user.relatedUser._id,
          {
            ...updatedData,
          },
          {
            runValidators: true,
          }
        ).lean(),
      ]

  const query = Promise.all(queryArray)

  query
    .then((values) => {
      updatedModel = values[0]
      updatedUser = values?.[1]
      return res.status(200).json({
        actionStatus: "success",
        theModel: { ...updatedModel, rootUser: updatedUser },
      })
    })
    .catch((err) => next(err))
}
