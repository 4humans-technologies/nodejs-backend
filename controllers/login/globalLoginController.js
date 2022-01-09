const Viewer = require("../../models/userTypes/Viewer")
const Model = require("../../models/userTypes/Model")
const User = require("../../models/User")
const Role = require("../../models/Role")
const errorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const jwtGenerator = require("../../utils/generateJwt")
const generateJwt = require("../../utils/generateJwt")
const io = require("../../socket")
const chatEventListeners = require("../../utils/socket/chat/chatEventListeners")

exports.loginHandler = (req, res, next) => {
  /**
   * login route for Model and Viewer only
   */

  if (req.user) {
    return res.status(200).json({
      actionStatus: "failed",
      message: "You are already logged in.",
    })
  }

  errorCollector(req, "Username of Password is incorrect, please try again!")

  const { username, password } = req.body
  const { socketId } = req.query

  let theUser
  let wasSocketUpdated = false
  User.findOne({
    username: username,
  })
    .select(
      "username needApproval userType relatedUser inProcessDetails password"
    )
    .populate({
      path: "relatedUser",
      select: "-streams -videoCallHistory -audioCallHistory",
      populate: [
        {
          path: "wallet",
          select: "currentAmount",
        },
        {
          path: "approval",
        },
        {
          path: "adminPriceRange",
        },
        {
          path: "pendingCalls.audioCalls",
        },
        {
          path: "pendingCalls.videoCalls",
        },
        {
          path: "documents",
        },
        {
          path: "privateImages",
        },
        {
          path: "privateVideos",
        },
      ],
    })
    .then((user) => {
      if (!user) {
        const error = new Error("Invalid credentials, User does not exists")
        error.statusCode = 422
        throw error
      } else if (user.needApproval) {
        const error = new Error(
          "You are either banned or not approved to proceed!"
        )
        error.statusCode = 422
        throw error
      }

      if (user.userType === "Staff") {
        const error = new Error(
          "This login form is NOT for superadmin and staff!"
        )
        error.statusCode = 422
        throw error
      }

      theUser = user
      return bcrypt.compare(password, user.password)
    })
    .then((didMatched) => {
      if (!didMatched) {
        const error = new Error("Invalid credentials")
        error.statusCode = 422
        throw error
      }
      User.updateOne({ _id: theUser._id }, { lastLogin: new Date() })
      const hours = 24
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
        /* add socket listeners for the specific userType */
        switch (theUser.userType) {
          case "Model":
            chatEventListeners.modelListeners(clientSocket)
            break
          case "Viewer":
            chatEventListeners.authedViewerListeners(clientSocket)
            break
          default:
            break
        }
        /* put any logged in user in his/her private room */
        clientSocket.join(`${theUser.relatedUser._id}-private`)
        clientSocket.data = {
          ...clientSocket.data,
          userId: theUser._id,
          relatedUserId: theUser.relatedUser._id,
        }
        clientSocket.authed = true
        clientSocket.userType = theUser.userType
        wasSocketUpdated = true
      } catch (error) {
        wasSocketUpdated = false
      }

      return res.status(200).json({
        actionStatus: "success",
        userType: theUser.userType,
        rootUserId: theUser._id,
        relatedUserId: theUser.relatedUser._id,
        expiresIn: hours,
        user: theUser,
        wasSocketUpdated: wasSocketUpdated,
        token: generateJwt({
          hours: hours,
          userId: theUser._id,
          relatedUserId: theUser.relatedUser._id,
          userType: theUser.userType,
          role: theUser?.role?.roleName || "no-role",
        }),
      })
    })
    .catch((err) => {
      next(err)
    })
}
