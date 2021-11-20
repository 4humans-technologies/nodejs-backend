const jwt = require("jsonwebtoken")
const Viewer = require("../../models/userTypes/Viewer")
const Model = require("../../models/userTypes/Model")

module.exports = {
  verifyToken: (client, next) => {
    // console.log("verifying token start");
    const token = client.handshake.auth.token
    if (token) {
      try {
        jwt.verify(token, process.env.SECRET, (error, decodedToken) => {
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
            client.data.userId = decodedToken.userId
            client.data.relatedUserId = decodedToken.relatedUserId
            client.authed = true
            client.userType = decodedToken.userType
            return next()
          }
        })
      } catch (err) {
        const error = new Error(err.message || "Internal server error")
        error.statusCode = 500
        return next(error)
      }
    } else {
      client.data = null
      client.authed = false
      client.userType = "UnAuthedViewer"
      return next()
    }
  },
  pendingCallResolver: (client, next) => {
    // console.log("checking pendingCalls");
    /* Call checking setup, only for authed users */
    if (client.authed) {
      /* un-authed clients cannot have calls */
      if (
        JSON.parse(client.handshake.query.hasAudioCall) ||
        JSON.parse(client.handshake.query.hasVideoCall)
      ) {
        if (client.userType === "Viewer" || "UnAuthedViewer") {
          /**
           * if viewer
           */
          Viewer.findById(client.data.relatedUserId)
            .select("pendingCall name")
            .populate("pendingCall")
            .lean()
            .then((viewer) => {
              if (viewer.pendingCall) {
                client.join(viewer.pendingCall._id)
                io.to(viewer.pendingCall._id).emit(
                  socketEvents.canAudiCallUsersConnectedAgain,
                  {
                    callId: viewer.pendingCall._id,
                    name: viewer.name,
                    callType: viewer.pendingCall.callType,
                  }
                )
              }
            })
        } else if (client.userType === "Model") {
          /**
           * if Model
           */
          Model.findById(client.data.relatedUserId)
            .select("pendingCalls name profileImage")
            .populate({
              path: "pendingCalls",
              populate: {
                path: "audioCalls",
                model: "AudioCall",
                select: "viewer",
              },
              populate: {
                path: "videoCalls",
                model: "VideoCall",
                select: "viewer",
              },
            })
            .lean()
            .then((model) => {
              if (
                model.pendingCalls.audioCalls ||
                model.pendingCalls.videoCalls
              ) {
                /** Remember that it is expected in 99% of the case, this will not be required for the call */
                /** create and join channel for each call */
                /** also check if any one is online  */
                const onlineUsers = []
                model.pendingCalls.audioCalls.forEach((call) => {
                  client.join(call._id)
                  io.to(call._id).emit(
                    socketEvents.canAudiCallUsersConnectedAgain,
                    {
                      callId: call._id,
                      name: model.name,
                      callType: "audioCall",
                      profileImage: model.profileImage,
                    }
                  )
                  if (io.sockets.adapter.rooms.get(call._id).size !== 1) {
                    /**if room size greater than one, then the viewer is also connected */
                    onlineUsers.push(call.viewer)
                  }
                })
                model.pendingCalls.videoCalls.forEach((call) => {
                  client.join(call._id)
                  io.to(call._id).emit(
                    socketEvents.canAudiCallUsersConnectedAgain,
                    {
                      callId: call._id,
                      name: model.name,
                      callType: "audioCall",
                      profileImage: model.profileImage,
                    }
                  )
                  if (io.sockets.adapter.rooms.get(call._id).size !== 1) {
                    /**if room size greater than one, then the viewer is also connected */
                    onlineUsers.push(call.viewer)
                  }
                })
              }
            })
        }
      }
    }
    next()
  },
}
