const Coupon = require("../../../../models/management/coupon")
exports.getCouponList = (req, res, next, options) => {
  Coupon.aggregate([
    {
      $match: options.match,
    } /* Even if i leave this empty, it will fetch all */,
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
        from: "Staff",
        foreignField: "_id",
        localField: "generatedBy",
        as: "generatedBy",
        // let: { rootUserId: "$generatedBy.rootUser" },
        // pipeline: [
        //   {
        //     $lookup: {
        //       from: "User",
        //       foreignField: "_id",
        //       localField: "$$rootUserId",
        //       as: "rootUser",
        //     },
        //   },
        // ],
      },
    },
    {
      $unwind: "$generatedBy",
    },
    {
      $lookup: {
        from: "Staff",
        foreignField: "_id",
        localField: "redeemedBy",
        as: "redeemedBy",
        // let: { rootUserId: "$redeemedBy.rootUser" },
        // pipeline: [
        //   {
        //     $lookup: {
        //       from: "User",
        //       foreignField: "_id",
        //       localField: "$$rootUserId",
        //       as: "rootUser",
        //     },
        //   },
        // ],
      },
    },
    {
      $unwind: "$rootUser",
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        generatedBy: 1,
        code: 1,
        forCoins: 1,
        redeemed: 1,
        redeemedBy: 1,
        redeemDate: 1,
      },
    },
    // {
    //   $facet: {
    //     records: [],
    //     totalCount: [{ $match: {} }, { $count: "totalCount" }],
    //   },
    // },
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
