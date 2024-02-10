// userTypes
const Model = require("../../../../models/userTypes/Model")
const Viewer = require("../../../../models/userTypes/Viewer")
const User = require("../../../../models/User")
const Coupon = require("../../../../models/management/coupon")

// globals
const AudioCall = require("../../../../models/globals/audioCall")
const VideoCall = require("../../../../models/globals/videoCall")
const Stream = require("../../../../models/globals/Stream")

// log
const Log = require("../../../../models/log/log")

exports.composeDashboard = (req, res, next) => {
  if (!req.user.permissions.includes("view-Dashboard")) {
    return Log({
      msg: `🔴 [ALERT] ${req.user?.username} tried to view Dashboard which he does not have permission to`,
      by: req.user?.userId,
    })
      .save()
      .then((log) => {
        console.log(log.msg)
        return res
          .status(403)
          .json({ message: "You are not authorized to view Dashboard" })
      })
      .catch((err) => {
        console.error(err)
        return next(err)
      })
  }

  const todayElapsed =
    new Date().getHours() * 3600 * 1000 +
    new Date().getMinutes() * 60 * 1000 +
    new Date().getSeconds() * 1000

  const todaysZeroHour = new Date(Date.now() - todayElapsed)

  const constructCouponPipeline = () => {
    return [
      {
        $match: {
          redeemed: true,
          //   createdAt: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
          redeemDate: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
        },
      },
      {
        $facet: {
          monthlyEarning: [
            {
              $group: {
                _id: null,
                sum: { $sum: "$forCoins" },
              },
            },
          ],
          monthlyCount: [
            {
              $count: "monthlyCount",
            },
          ],
          weeklyEarning: [
            {
              $match: {
                redeemDate: {
                  $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000),
                },
              },
            },
            {
              $group: {
                _id: null,
                sum: { $sum: "$forCoins" },
              },
            },
          ],
          todayEarning: [
            {
              $match: {
                redeemDate: {
                  $gte: todaysZeroHour,
                },
              },
            },
            {
              $group: {
                _id: null,
                sum: { $sum: "$forCoins" },
              },
            },
          ],
        },
      },
    ]
  }

  // last 20 logs
  //   streams today
  //   audioCalls today
  //   videoCalls today
  //   viewers joined today
  //   total models

  Promise.all([
    Log.find().sort("-_id").limit(20).select("-_id").lean().populate({
      path: "by",
      select: "username -_id",
    }),
    Stream.find({ createdAt: { $gte: todaysZeroHour } }).countDocuments(),
    AudioCall.find({ createdAt: { $gte: todaysZeroHour } }).countDocuments(),
    VideoCall.find({ createdAt: { $gte: todaysZeroHour } }).countDocuments(),
    User.find({
      userType: "Viewer",
      createdAt: { $gte: todaysZeroHour },
    })
      .select(
        "username createdAt inProcessDetails.emailVerified inProcessDetails.phoneVerification"
      )
      .sort("-_id")
      .limit(10)
      .lean(),
    Model.find({
      $or: [{ isStreaming: true }, { onCall: true }],
    }).countDocuments(),
    User.find({
      userType: "Model",
      needApproval: true,
    })
      .select("username createdAt needApproval relatedUser userType")
      .populate({
        path: "relatedUser",
        select: "name profileImage",
      })
      .sort({ createdAt: -1 })
      .lean(),
    Model.find().countDocuments(),
    Viewer.find().countDocuments(),
    Coupon.aggregate(constructCouponPipeline()),
  ])
    .then((results) => {
      const [
        logs,
        streams,
        audioCalls,
        videoCalls,
        todayViewers,
        liveModels,
        unApprovedModels,
        totalModels,
        totalViewers,
        [
          {
            monthlyEarning: [monthlyEarning],
            monthlyCount: [monthlyCount],
            weeklyEarning: [weeklyEarning],
            todayEarning: [todayEarning],
          },
        ],
      ] = results

      return res.status(200).json({
        dataNumbers: {
          streams,
          audioCalls,
          videoCalls,
          todayViewers: todayViewers.length,
          liveModels,
          totalModels,
          totalViewers,
          monthlyEarning: monthlyEarning?.sum || 0,
          monthlyCount: monthlyCount?.monthlyCount || 0,
          weeklyEarning: weeklyEarning?.sum || 0,
          todayEarning: todayEarning?.sum || 0,
        },
        logs,
        unApprovedModels,
        todayViewers,
      })
    })
    .catch((err) => next(err))
}

exports.getStreamedMinutes = (req, res, next) => {
  const { modelId } = req.params

  Stream.find({
    model: modelId,
    createdAt: {
      $gte: new Date(Date.now() - 3600 * 24 * 1000),
      $lte: new Date(),
    },
  })
    .lean()
    .select("duration -_id")
    .then((streams) => {
      return res.status(200).json({
        lastTwentyFourHourStreams: streams,
      })
    })
    .catch((err) => next(err))
}
