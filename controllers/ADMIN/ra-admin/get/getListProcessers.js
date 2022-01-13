const Coupon = require("../../../../models/management/coupon")
const Model = require("../../../../models/userTypes/Model")
const CoinsSpendHistory = require("../../../../models/globals/coinsSpendHistory")
exports.getCouponList = (req, res, next, options) => {
  const pipeline = []
  const fixedStages = [
    {
      $sort: options.sort,
    },
    {
      $skip: options.skip,
    },
    {
      $limit: options.limit,
    },
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
  ]

  if (Object.keys(options.match).length > 0) {
    pipeline.push({
      $match: options.match,
    })
  }

  fixedStages.forEach((stage) => {
    pipeline.push(stage)
  })

  Coupon.aggregate(pipeline)
    .then((records) => {
      const totalCount = records.length
      res.setHeader(
        "Content-Range",
        `${options.skip}-${
          options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
        }/${totalCount}`
      )

      return res.status(200).json(
        records.map((record) => ({
          id: record._id,
          ...record,
        }))
      )
    })
    .catch((err) => next(err))
}

exports.getCoinSpendHistories = (req, res, next, options) => {
  CoinsSpendHistory.aggregate([
    {
      $match: options.match,
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
  ])
    .then((records) => {
      const totalCount = records.length
      res.setHeader(
        "Content-Range",
        `${options.skip}-${
          options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
        }/${totalCount}`
      )

      return res.status(200).json(
        records.map((record) => ({
          id: record._id,
          ...record,
        }))
      )
    })
    .catch((err) => next(err))
}

exports.getModel = (req, res, next, options) => {
  Model.aggregate([
    {
      $match: options.match,
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
      $sort: options.sort,
    },
    {
      $skip: options.skip,
    },
    {
      $limit: options.limit,
    },
  ])
    .then((records) => {
      const totalCount = records.length
      res.setHeader(
        "Content-Range",
        `${options.skip}-${
          options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
        }/${totalCount}`
      )

      return res.status(200).json(
        records.map((record) => ({
          id: record._id,
          ...record,
        }))
      )
    })
    .catch((err) => next(err))
}
