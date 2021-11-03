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

  const walletId = new ObjectId()
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()

  bcrypt
    .genSalt(5)
    .then((salt) => {
      bcrypt.hash(password, salt).then((hashedPassword) => {
        return Promise.allSettled([
          Wallet({
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
              lastLogin: new Date().toISOString(),
            },
          }).save({
            w: 1,
            j: false,
          }),
        ])
      })
    })
    .catch((err) => {
      /* error generating salt password */
      const error = new Error(err.message + " viewer not registered")
      error.statusCode = err.statusCode || 500
      return next(error)
    })

  bcrypt.genSalt(5, (err_1, salt) => {
    if (!err_1) {
      return bcrypt.hash(password, salt, (err_2, hashedPassword) => {
        if (!err_2) {
          return Promise.allSettled([
            Wallet({
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
                lastLogin: new Date().toISOString(),
              },
            }).save({
              w: 1,
              j: false,
            }),
          ])
            .then((values) => {
              const errorList = []
              const fullFilledList = []
              const valueOrder = ["wallet", "viewer", "user"]
              let hasError = false
              values.forEach((value, index) => {
                if (value.status === "rejected") {
                  errorList.push({
                    ...value,
                    model: valueOrder[index],
                  })
                  hasError = true
                } else {
                  fullFilledList.push({
                    id: value._id,
                    model: valueOrder[index],
                  })
                }
              })
              if (hasError) {
                const newError = new Error("err")
                newError.fullFilledList = fullFilledList
                newError.errorList = errorList
                throw newError
              } else {
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
              }
            })
            .catch((err) => {
              const deleteList = []
              err.fullFilledList.forEach((error, index) => {
                if (error.model === "wallet") {
                  deleteList.push(Wallet.deleteOne({ _id: walletId }))
                } else if (error.model === "viewer") {
                  deleteList.push(Viewer.deleteOne({ _id: advRelatedUserId }))
                } else if (error.model === "user") {
                  deleteList.push(User.deleteOne({ _id: advRootUserId }))
                }
              })
              return Promise.all([...deleteList])
                .then((values) => {
                  const fullfillError = err.errorList[0].reason
                  if (fullfillError?.name === "MongoError") {
                    switch (fullfillError.code) {
                      case 11000:
                        const field = Object.keys(fullfillError.keyValue)[0]
                        const fieldValue = fullfillError.keyValue[field]
                        errMessage = `${field} "${fieldValue}", is already used. Please try with a different ${field}`
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
                    const error = new Error(
                      err.message || "viewer not registered"
                    )
                    error.statusCode = err.statusCode || 500
                    throw error
                  }
                })
                .catch((err_x) => {
                  return next(err_x)
                })
            })
        }
        /* error generating hashed password */
        const error_1 = new Error(err_2.message + "viewer not registered, salt")
        error_1.statusCode = err_2.statusCode || 500
        return next(error_1)
      })
    }
    /* error generating salt password */
    const error = new Error(err_1.message + " viewer not registered")
    error.statusCode = err_1.statusCode || 500
    return next(error)
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
