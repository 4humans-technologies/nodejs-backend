const Coupon = require("../../../../models/management/coupon")
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
        let: { id: "$forModel" },
        pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$id"] } } }],
        // foreignField: "_id",
        // localField: "forModel",
        as: "forModel",
      },
    },
    {
      $unwind: "$forModel",
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "forModel.rootUser",
        as: "forModel.rootUser",
      },
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
  ])
}
