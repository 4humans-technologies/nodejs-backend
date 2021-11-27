const Approval = require("../../models/management/approval")
const User = require("../../models/User")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const Wallet = require("../../models/globals/wallet")
const {
  generatePasswordResetJWT,
} = require("../../utils/generatePasswordResetJWT")
const { sendPasswordResetLink } = require("../../sendgrid")
const PasswordResetToken = require("../../models/management/passwordTokens")

/* email conformation, e-mail conformation */
exports.handleEmailConformation = (req, res, next) => {
  const { token } = req.body

  if (token) {
    try {
      /* using 🔺EMAIL_SECRET🔺 */
      jwt.verify(
        token,
        process.env.EMAIL_SECRET,
        { ignoreExpiration: true },
        (error, decodedToken) => {
          if (error) {
            if (
              error.message ===
              "jwt malformed, Not Authenticated, Invalid token"
            ) {
              const err = new Error(error.message)
              err.statusCode = 401
              return next(err)
            } else {
              const err = new Error("Not Authenticated, Invalid token")
              err.statusCode = 401
              return next(err)
            }
          }
          if (decodedToken) {
            let query
            User.findById(decodedToken.userId)
              .lean()
              .select("needApproval inProcessDetails")
              .then((user) => {
                if (
                  user.needApproval &&
                  user.inProcessDetails.emailVerified === false
                ) {
                  /* continue verification */
                  if (decodedToken?.confirmBefore >= Date.now()) {
                    switch (decodedToken.userType) {
                      case "Model":
                        query = User.findByIdAndUpdate(decodedToken.userId, {
                          needApproval: true,
                          $set: { "inProcessDetails.emailVerified": true },
                        })
                          .lean()
                          .select("needApproval")
                        break
                      case "Viewer":
                        query = Promise.all([
                          User.findByIdAndUpdate(decodedToken.userId, {
                            needApproval: false,
                            $unset: { inProcessDetails: 1 },
                          }),
                          Wallet.updateOne(
                            {
                              rootUser: decodedToken.rootUser,
                            },
                            {
                              /**
                               * as user should not be able to buy money before hand
                               */
                              $set: {
                                currentAmount:
                                  process.env
                                    .DEFAULT_SIGNUP_WALLET_AMOUNT_FOR_VIEWER,
                              },
                            }
                          ),
                        ])
                        break
                      default:
                        break
                    }
                    query
                      .then(() => {
                        if (decodedToken.userType === "Viewer") {
                          /* coins added */
                          return res.status(200).json({
                            actionStatus: "success",
                            coinsAdded:
                              process.env
                                .DEFAULT_SIGNUP_WALLET_AMOUNT_FOR_VIEWER,
                            userType: decodedToken.userType,
                            expireDays:
                              process.env
                                .EMAIL_CONFORMATION_EXPIRY_HOURS_VIEWER,
                          })
                        } else if (decodedToken.userType === "Model") {
                          /*  */
                          return res.status(200).json({
                            actionStatus: "success",
                            userType: decodedToken.userType,
                            expireDays:
                              process.env.EMAIL_CONFORMATION_EXPIRY_HOURS_MODEL,
                          })
                        }
                      })
                      .catch((err) => {
                        return next(err)
                      })
                  } else {
                    /* expired but valid jwt */
                    return res.status(200).json({
                      actionStatus: "failed",
                      reason: "Jwt expired",
                      userType: decodedToken.userType,
                    })
                  }
                } else {
                  return res.status(200).json({
                    actionStatus: "failed",
                    reason: "already verified",
                    userType: decodedToken.userType,
                    alreadyVerified: true,
                  })
                }
              })
          }
        }
      )
    } catch (err) {
      const error = new Error(err.message || "Internal server error")
      error.statusCode = 500
      return next(error)
    }
  } else {
    return res.status(500).json({
      actionStatus: "failed",
      reason: "no token provided",
      message: "no token provided",
    })
  }
}

exports.sendPasswordLink = (req, res, next) => {
  const { username } = req.body
  let user
  User.findOne({
    username: username,
  })
    .populate({
      path: "relatedUser",
      select: "email name",
    })
    .lean()
    .then((theUser) => {
      user = theUser
      return PasswordResetToken({
        forUser: theUser._id,
      }).save()
    })
    .then((token) => {
      const passwordResetJWT = generatePasswordResetJWT({
        userType: user.userType,
        relatedUserId: user.relatedUser._id,
        userId: user._id,
        uidToken: token.uidToken,
      })

      sendPasswordResetLink({
        to: user.relatedUser.email,
        dynamic_template_data: {
          reset_url: `${
            process.env.FRONTEND_URL.includes("localhost") ? "http" : "https"
          }://${
            process.env.FRONTEND_URL
          }/link-verification/password/verify?token=${passwordResetJWT}`,
          first_name: user.relatedUser.name.split(" ")[0],
          validity_days:
            user.userType === "Model"
              ? +process.env.PASSWORD_RESET_EXPIRY_HOURS_MODEL / 24
              : +process.env.PASSWORD_RESET_EXPIRY_HOURS_VIEWER / 24,
          user_email: user.relatedUser.email,
          request_time: new Date().toLocaleTimeString(),
        },
      })

      return res.status(200).json({
        actionStatus: "success",
        message: "sent successfully",
      })
    })
    .catch((err) => next(err.message))
}

exports.verifyTokenInitially = (req, res, next) => {
  const { token } = req.body

  if (token) {
    try {
      jwt.verify(token, process.env.EMAIL_SECRET, (error, decodedToken) => {
        if (error) {
          if (
            error.message === "jwt malformed, Not Authenticated, Invalid token"
          ) {
            const err = new Error(error.message)
            err.statusCode = 401
            return next(err)
          } else {
            const err = new Error("Not Authenticated, Invalid token")
            err.statusCode = 401
            return next(err)
          }
        }
        if (decodedToken) {
          PasswordResetToken.findOne({
            uidToken: decodedToken.uidToken,
          })
            .then((token) => {
              if (token && decodedToken?.confirmBefore >= Date.now()) {
                return res.status(200).json({
                  actionStatus: "success",
                  valid: true,
                })
              } else {
                return res.status(200).json({
                  actionStatus: "failed",
                  valid: false,
                })
              }
            })
            .catch((err) => next(err.message))
        }
      })
    } catch (err) {
      const error = new Error("Invalid Link")
      error.statusCode = 400
      return next(error)
    }
  } else {
    return res.status(400).json({
      actionStatus: "failed",
      reason: "no token provided",
      message: "no token provided",
    })
  }
}

exports.verifyTokenAndReset = (req, res, next) => {
  const { token, newPassword, newPasswordConformation } = req.body
  if (newPassword !== newPasswordConformation) {
    return res.status(400).json({
      actionStatus: "success",
    })
  }

  if (token) {
    try {
      jwt.verify(token, process.env.EMAIL_SECRET, (error, decodedToken) => {
        if (error) {
          if (
            error.message === "jwt malformed, Not Authenticated, Invalid token"
          ) {
            const err = new Error(error.message)
            err.statusCode = 401
            return next(err)
          } else {
            const err = new Error("Not Authenticated, Invalid token")
            err.statusCode = 401
            return next(err)
          }
        }
        if (decodedToken) {
          if (decodedToken?.confirmBefore <= Date.now()) {
            const error = new Error("Link was expired!")
            error.statusCode = 400
            throw error
          }
          PasswordResetToken.findOne({
            uidToken: decodedToken.uidToken,
          })
            .then((token) => {
              if (token) {
                return bcrypt.genSalt(5)
              } else {
                const error = new Error("Invalid Link/credentials")
                error.statusCode = 400
                throw error
              }
            })
            .then((salt) => {
              return bcrypt.hash(newPassword, salt)
            })
            .then((hashedPassword) => {
              return Promise.all([
                User.updateOne(
                  {
                    _id: decodedToken.userId,
                  },
                  {
                    password: hashedPassword,
                  },
                  {
                    runValidators: true,
                  }
                ),
                PasswordResetToken.deleteOne({
                  uidToken: decodedToken.uidToken,
                }),
              ])
            })
            .then(([user, token]) => {
              if (user.n === 1 && token.n === 1) {
                return res.status(200).json({
                  actionStatus: "success",
                  message: "password was reset successfully",
                })
              }
            })
            .catch((err) => next(err.message))
        }
      })
    } catch (err) {
      const error = new Error("Invalid Link")
      error.statusCode = 400
      return next(error)
    }
  } else {
    return res.status(400).json({
      actionStatus: "failed",
      reason: "no token provided",
      message: "no token provided",
    })
  }
}
