const dotObject = require("dot-object")
const Viewer = require("../../../../models/userTypes/Viewer")
const Staff = require("../../../../models/userTypes/Staff")
const Coupon = require("../../../../models/management/coupon")
const Model = require("../../../../models/userTypes/Model")
const Role = require("../../../../models/Role")
const CoinsSpendHistory = require("../../../../models/globals/coinsSpendHistory")

exports.getCouponList = (req, res, next, options) => {
  const pipeline = []

  if (options.match?.["forCoins"]) {
    options.match["forCoins"] = +options.match["forCoins"]
  }

  if (options.match?.["redeemed"]) {
    options.match["redeemed"] = Boolean(options.match["redeemed"])
  }
  const fixedStages = [
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "generatedBy",
        as: "generatedBy",
      },
    },
    {
      $unwind: "$generatedBy",
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "redeemedBy",
        as: "redeemedBy",
      },
    },
    {
      $unwind: {
        path: "$redeemedBy",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: dotObject.dot(options.match),
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        code: 1,
        forCoins: 1,
        redeemed: 1,
        redeemDate: 1,
        "generatedBy.username": 1,
        "redeemedBy.username": 1,
      },
    },
    {
      $facet: {
        records: [
          {
            $sort: options.sort,
          },
          {
            $skip: options.skip,
          },
          {
            $limit: options.limit,
          },
        ],
        count: [{ $count: "totalCount" }],
      },
    },
  ]

  // if (Object.keys(options.match).length > 0) {
  //   pipeline.push({
  //     $match: dotObject.dot(options.match),
  //   })
  // }

  fixedStages.forEach((stage) => {
    pipeline.push(stage)
  })

  Coupon.aggregate(pipeline)
    .then(([{ records, count }]) => {
      const totalCount = count?.[0]?.totalCount || 0
      res.setHeader(
        "Content-Range",
        `${options.skip}-${
          options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
        }/${totalCount}`
      )

      return res.status(200).json(records)
    })
    .catch((err) => next(err))
}

exports.getCoinSpendHistories = (req, res, next, options) => {
  CoinsSpendHistory.aggregate([
    {
      $lookup: {
        from: "models",
        localField: "forModel",
        foreignField: "_id",
        as: "forModel",
      },
    },
    {
      $unwind: "$forModel",
    },
    {
      $lookup: {
        from: "users",
        localField: "forModel.rootUser",
        foreignField: "_id",
        as: "forModel.rootUser",
      },
    },
    {
      $unwind: "$forModel.rootUser",
    },
    {
      $project: {
        forModel: {
          profileImage: 1,
          name: 1,
          rootUser: {
            username: 1,
          },
        },
        time: 1,
        sharePercent: 1,
        tokenAmount: 1,
        by: 1,
        givenFor: 1,
      },
    },
    {
      $match: dotObject.dot(options.match),
    },
    {
      $facet: {
        records: [
          {
            $sort: options.sort,
          },
          {
            $skip: options.skip,
          },
          {
            $limit: options.limit,
          },
        ],
        count: [{ $count: "totalCount" }],
      },
    },
  ])
    .then(([{ records, count }]) => {
      const totalCount = count?.[0]?.totalCount || 0
      res.setHeader(
        "Content-Range",
        `${options.skip}-${
          options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
        }/${totalCount}`
      )
      return res.status(200).json(records)
    })
    .catch((err) => next(err))
}

exports.getModel = (req, res, next, options) => {
  Model.aggregate([
    {
      $project: {
        callActivity: 0,
        tipMenuActions: 0,
        pendingCalls: 0,
        bankDetails: 0,
        followers: 0,
        languages: 0,
        bio: 0,
        publicImages: 0,
        publicVideos: 0,
        privateImages: 0,
        privateVideos: 0,
        streams: 0,
        videoCallHistory: 0,
        audioCallHistory: 0,
        approval: 0,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "rootUser",
        foreignField: "_id",
        as: "rootUser",
      },
    },
    {
      $unwind: "$rootUser",
    },
    {
      $lookup: {
        from: "wallets",
        localField: "wallet",
        foreignField: "_id",
        as: "wallet",
      },
    },
    {
      $unwind: "$wallet",
    },
    {
      $project: {
        profileImage: 1,
        rootUser: {
          username: 1,
          needApproval: 1,
          "meta.lastLogin": 1,
        },
        wallet: {
          currentAmount: 1,
        },
        name: 1,
        numberOfFollowers: 1,
        sharePercent: 1,
        rating: 1,
        isStreaming: 1,
        onCall: 1,
        adminRemark: 1,
      },
    },
    {
      $match: {
        "rootUser.needApproval": false,
      },
    },
    {
      $match: dotObject.dot(options.match),
    },
    {
      $facet: {
        records: [
          {
            $sort: options.sort,
          },
          {
            $skip: options.skip,
          },
          {
            $limit: options.limit,
          },
        ],
        count: [{ $count: "totalCount" }],
      },
    },
  ])
    .then(([{ records, count }]) => {
      const totalCount = count?.[0]?.totalCount || 0
      res.setHeader(
        "Content-Range",
        `${options.skip}-${
          options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
        }/${totalCount}`
      )

      return res.status(200).json(records)
    })
    .catch((err) => next(err))
}

exports.getUnApprovedModels = (req, res, next, options) => {
  const User = options.requiredModels.User

  User.find({
    needApproval: true,
    userType: "Model",
  })
    .select("relatedUser")
    .lean()
    .then((users) => {
      const myMatch = dotObject.dot(options.match)
      return Model.aggregate([
        {
          $match: {
            _id: { $in: users.map((user) => user.relatedUser._id) },
            ...myMatch,
          },
        },
        {
          $project: {
            callActivity: 0,
            tipMenuActions: 0,
            pendingCalls: 0,
            bankDetails: 0,
            followers: 0,
            languages: 0,
            bio: 0,
            publicImages: 0,
            publicVideos: 0,
            privateImages: 0,
            privateVideos: 0,
            streams: 0,
            videoCallHistory: 0,
            audioCallHistory: 0,
            approval: 0,
            bannedStates: 0,
            hobbies: 0,
            topic: 0,
            dynamicFields: 0,
            adminRemark: 0,
            welcomeMessage: 0,
          },
        },
        {
          $facet: {
            records: [
              {
                $lookup: {
                  from: "users",
                  localField: "rootUser",
                  foreignField: "_id",
                  as: "rootUser",
                },
              },
              {
                $unwind: "$rootUser",
              },
              {
                $project: {
                  profileImage: 1,
                  email: 1,
                  phone: 1,
                  dob: 1,
                  gender: 1,
                  rootUser: {
                    username: 1,
                    "meta.lastLogin": 1,
                  },
                  name: 1,
                  adminRemark: 1,
                },
              },
              {
                $sort: options.sort,
              },
              {
                $skip: options.skip,
              },
              {
                $limit: options.limit,
              },
            ],
            count: [{ $count: "totalCount" }],
          },
        },
      ])
    })
    .then(([{ records, count }]) => {
      const totalCount = count?.[0]?.totalCount || 0
      res.setHeader(
        "Content-Range",
        `${options.skip}-${
          options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
        }/${totalCount}`
      )

      return res.status(200).json(records)
    })
    .catch((err) => next(err))
}

exports.getViewerList = (req, res, next, options) => {
  /**
   * for viewer increase the debounce or do search on click
   */
  Viewer.aggregate([
    {
      $project: {
        backgroundImage: 0,
        hobbies: 0,
        following: 0,
        streams: 0,
        currentChatPlan: 0,
        privateImagesPlans: 0,
        privateVideosPlans: 0,
        videoCallHistory: 0,
        audioCallHistory: 0,
        pendingCalls: 0,
        privateChats: 0,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "rootUser",
        foreignField: "_id",
        as: "rootUser",
      },
    },
    {
      $unwind: "$rootUser",
    },
    {
      $lookup: {
        from: "wallets",
        localField: "wallet",
        foreignField: "_id",
        as: "wallet",
      },
    },
    {
      $unwind: "$wallet",
    },
    {
      $project: {
        email: 1,
        profileImage: 1,
        rootUser: {
          username: 1,
          "meta.lastLogin": 1,
          createdAt: 1,
          "inProcessDetails.emailVerified": 1,
          "inProcessDetails.phoneVerification": 1,
        },
        wallet: {
          currentAmount: 1,
        },
        name: 1,
        gender: 1,
        isChatPlanActive: 1,
      },
    },
    {
      $match: dotObject.dot(options.match),
    },
    {
      $facet: {
        records: [
          {
            $sort: options.sort,
          },
          {
            $skip: options.skip,
          },
          {
            $limit: options.limit,
          },
        ],
        count: [{ $count: "totalCount" }],
      },
    },
  ])
    .then(([{ records, count }]) => {
      const totalCount = count?.[0]?.totalCount || 0
      res.setHeader(
        "Content-Range",
        `${options.skip}-${
          options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
        }/${totalCount}`
      )

      return res.status(200).json(records)
    })
    .catch((err) => next(err))
}

exports.getRoleList = (req, res, next, options) => {
  Role.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $unwind: "$createdBy",
    },
    {
      $match: dotObject.dot(options.match),
    },
    {
      $facet: {
        records: [
          {
            $sort: options.sort,
          },
          {
            $skip: options.skip,
          },
          {
            $limit: options.limit,
          },
        ],
        count: [{ $count: "totalCount" }],
      },
    },
  ])
    .then(([{ records, count }]) => {
      const totalCount = count?.[0]?.totalCount || 0
      res.setHeader(
        "Content-Range",
        `${options.skip}-${
          options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
        }/${totalCount}`
      )
      return res.status(200).json(records.map((r) => ({ id: r._id, ...r })))
    })
    .catch((err) => next(err))
}

exports.getStaffList = (req, res, next, options) => {
  Staff.aggregate([
    {
      $project: {
        email: 0,
        phone: 0,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "rootUser",
        foreignField: "_id",
        as: "rootUser",
      },
    },
    {
      $unwind: "$rootUser",
    },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $unwind: {
        path: "$createdBy",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "roles",
        localField: "rootUser.role",
        foreignField: "_id",
        as: "rootUser.role",
      },
    },
    {
      $unwind: {
        path: "$rootUser.role",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: dotObject.dot(options.match),
    },
    {
      $project: {
        rootUser: {
          username: 1,
          role: {
            roleName: 1,
          },
        },
        name: 1,
        remark: 1,
        profileImage: 1,
        createdBy: {
          username: 1,
        },
      },
    },
    {
      $facet: {
        records: [
          {
            $sort: options.sort,
          },
          {
            $skip: options.skip,
          },
          {
            $limit: options.limit,
          },
        ],
        count: [{ $count: "totalCount" }],
      },
    },
  ])
    .then(([{ records, count }]) => {
      const totalCount = count?.[0]?.totalCount || 0
      res.setHeader(
        "Content-Range",
        `${options.skip}-${
          options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
        }/${totalCount}`
      )

      return res.status(200).json(records)
    })
    .catch((err) => next(err))
}
