const jwt = require("jsonwebtoken")

exports.generatePasswordResetJWT = (params) => {
  let { userType, relatedUserId, userId, uidToken } = params

  let hours
  switch (userType) {
    case "Model":
      hours = +process.env.PASSWORD_RESET_EXPIRY_HOURS_MODEL
      break
    case "viewer":
      hours = +process.env.PASSWORD_RESET_EXPIRY_HOURS_VIEWER
      break
    default:
      hours = +process.env.PASSWORD_RESET_EXPIRY_HOURS_MODEL
      break
  }

  const expireIn = 60 * 60 * hours
  const token = jwt.sign(
    {
      userId: userId.toString(),
      relatedUserId: relatedUserId.toString(),
      userType: userType,
      confirmBefore: Date.now() + expireIn * 1000,
      uidToken: uidToken,
    },
    process.env.EMAIL_SECRET,
    { expiresIn: expireIn }
  )
  return token
}
