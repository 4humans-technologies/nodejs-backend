const UnAuthedViewer = require("../../models/userTypes/UnAuthedViewer");
const controllerErrorCollector = require("../../utils/controllerErrorCollector");
const rtcTokenGenerator = require("../../utils/rtcTokenGenerator");
const Stream = require("../../models/globals/Stream");
const Model = require("../../models/userTypes/Model");
const { Types } = require("mongoose");
const Viewer = require("../../models/userTypes/Viewer");
const io = require("../../socket");
const socketEvents = require("../../utils/socket/socketEvents");
const UniqueChatUserId = require("../../models/twilio/UniqueChatUserId")

const findAvailableTwilioChatUserId = () => {
  return UniqueChatUserId.findOne({ isAvailable: true })
    .then(id => {
      if (!id) {
        return UniqueChatUserId({})
          .save()
          .then(newId => {
            return newId._id
          })
      }
      UniqueChatUserId.update({ _id: id._id }, {
        $inc: {
          "numUsersServed": 1,
        }
      })
      return id
    })
}

exports.createStreamAndToken = (req, res, next) => {
  // create stream and generate token for model
  // this end point will be called by the model

  controllerErrorCollector(req);
  // will keep channel as modelID

  // 🔴🔴
  // if(!req.user.relatedUser.approval._id){
  //     // throw ERROR
  //     // or
  //     // create a middleware to check for this every time
  // }
  // check if the model is approved or not,
  // by making a new model approval checker

  // this to be added in production 🔴❌
  // check for only one ongoing stream
  // Stream.find({ model: req.user.relatedUser._id, status: { $in: ["ongoing", "initializing"] } })
  //   .then(stream => {
  //     if (!stream) {
  //       // go-on everything fine
  //     }
  //     // throw error: you already have another stream on-going or initializing
  //   })

  let theStream;
  Stream({
    model: req.user.relatedUser._id,
    createdAt: new Date().toISOString(),
  })
    .save()
    .then((stream) => {
      theStream = stream;
      return Model.findOneAndUpdate(
        { _id: req.user.relatedUser._id },
        {
          isStreaming: true,
          currentStream: stream._id,
          $push: { streams: stream },
        }
      );
    })
    .then((model) => {
      // io.join(theStream._id)
      // everybody will get the notification of new stream

      // generate token here
      const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
        "model",
        req.user.relatedUser._id.toString(),
        theStream._id.toString(),
        1
      );

      io.getClient().join(theStream._id.toString())

      res.status(200).json({
        actionStatus: "success",
        rtcToken: rtcToken,
        privilegeExpiredTs: privilegeExpiredTs,
        streamId: theStream._id,
        modelId: req.user.relatedUser._id
      });
    })
    .catch((err) => next(err));
};

exports.genRtcTokenViewer = (req, res, next) => {
  // for viewer who are loggedIn, and want to view model stream
  // just generate token and update stats
  controllerErrorCollector(req);

  const { viewerId, channel, streamId } = req.body;
  const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
    "viewer",
    viewerId,
    channel
  );

  const streamPr = Stream.findOneAndUpdate(
    { _id: streamId },
    {
      $push: {
        viewers: Types.ObjectId(viewerId),
      },
      $inc: {
        "meta.viewerCount": 1,
      },
    }
  );

  const viewerPr = Viewer.updateOne(
    {
      _id: viewerId,
    },
    {
      $push: { streams: Types.ObjectId(streamId) },
    }
  );

  Promise.all([streamPr, viewerPr])
    .then((values) => {
      // socket emit events
      // io.join(streamId)
      io.getIO()
        .to(streamId)
        .emit(socketEvents.viewerJoined, {
          viewerCount: values[0].get("meta.viewerCount"),
        });

      // http response
      res.status(200).json({
        actionStatus: "success",
        rtcToken: rtcToken,
        privilegeExpiredTs: privilegeExpiredTs,
        viewerCount: values[0].get("meta.viewerCount"),
      });
    })
    .catch((err) => next(err));
};

exports.generateRtcTokenUnauthed = (req, res, next) => {
  controllerErrorCollector(req);
  // will run when unauthed user try to view models live stream, not when he enters the website
  // create unAuthed user and generate token
  const { modelId, newSession, unAuthedUserId } = req.body;

  Model.findById(modelId, "currentStream isStreaming onCall")
    .lean()
    .then(model => {
      console.log(model);
      if (model.isStreaming) {
        if (!req.body.unAuthedUserId && !req.user) {
          /**
           * means the un-authed user is untracked
           * create a new un-authed user
           */

          /** find a available twillioChatUserId */
          return findAvailableTwilioChatUserId()
            .then(tempToken => {
              return UnAuthedViewer({
                sessions: 1,
                streamViewed: 1,
                timeSpent: 0,
                lastStream: model.currentStream,
                twillioChatUserId: tempToken
              })
                .save()
                .then(viewer => {
                  // generate twilio chat token as well
                  const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                    "unAuthed",
                    viewer._id,
                    model.currentStream.toString()
                  );

                  io.getIO()
                    .to(streamId)
                    .emit(socketEvents.viewerJoined, {
                      viewerCount: values[0].get("meta.viewerCount"),
                    });

                  return Stream.updateOne(
                    { _id: model.currentStream },
                    {
                      $inc: {
                        "meta.viewerCount": 1,
                      },
                    }
                  )
                    .lean()
                    .then(stream => {
                      res.status(200).json({
                        actionStatus: "success",
                        uid: viewer._id,
                        rtcToken: rtcToken,
                        privilegeExpiredTs: privilegeExpiredTs,
                        newUnAuthedUserCreated: true
                      })
                    })
                })
                .catch(err => next(err))
            })
        }
        /**
         * means the un-authed user is already initialized
         * and being tracked
         */
        return UnAuthedViewer.findById(req.body.unAuthedUserId)
          .then(viewer => {
            if (!viewer?.twillioChatUserId && req.body.newSession) {
              /**
               * new session and hence new temp id for twilio from the pool
               */
              findAvailableTwilioChatUserId()
                .then(tempId => {
                  viewer.twillioChatUserId = tempId
                  return viewer.save()
                })
                .then(savedViewer => {
                  // generate twilio chat token as well
                  const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                    "unAuthed",
                    viewer.twillioChatUserId,
                    model.currentStream.toString()
                  );
                  return { privilegeExpiredTs, rtcToken }
                })
            } else {
              /**
               * its a subsequent request by the viewer, he has already been alloted the temp token
               */

              // generate twilio chat token as well
              const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
                "unAuthed",
                viewer.twillioChatUserId,
                model.currentStream.toString()
              );
              return { privilegeExpiredTs, rtcToken }
            }
          })
          .then(tokens => {
            /**
             * currently only returning rtc token,
             * will also return twilio chat token later
             */
            return Stream.updateOne(
              { _id: model.currentStream },
              {
                $inc: {
                  "meta.viewerCount": 1,
                },
              }
            )
              .lean()
              .then(stream => {
                io.getIO()
                  .to(streamId)
                  .emit(socketEvents.viewerJoined, {
                    viewerCount: values[0].get("meta.viewerCount"),
                  });
                res.status(200).json({
                  actionStatus: "success",
                  ...tokens
                })
              })
          })
      }
      const error = new Error("This model is currently not streaming!")
      error.statusCode = 400
      throw error
    })
    .catch(error => next(error))
};

exports.renewRtcTokenGlobal = (req, res, next) => {
  // renew token for anybody be model or viewer or unAuthed viewer
  controllerErrorCollector(req);
  const { channel, relatedUserId } = req.body;
  if (!req.user) {
    UnAuthedViewer.findOne({ _id: relatedUserId })
      .then((viewer) => {
        if (!viewer) {
          const err = new Error("Not Authorized");
          err.statusCode = 401;
          throw err;
        }
        const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
          "unAuthed",
          relatedUserId,
          channel
        );
        return res.status(200).json({
          actionStatus: "success",
          rtcToken: rtcToken,
          privilegeExpiredTs: privilegeExpiredTs,
        });
      })
      .catch((err) => next(err));
  }

  if (req.user.userType === "Viewer") {
    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
      "viewer",
      relatedUserId,
      channel
    );
  } else if (req.user.userType === "Model") {
    const { privilegeExpiredTs, rtcToken } = rtcTokenGenerator(
      "model",
      relatedUserId,
      channel
    );
  }

  res.status(200).json({
    actionStatus: "success",
    rtcToken: rtcToken,
    privilegeExpiredTs: privilegeExpiredTs,
  });
};
