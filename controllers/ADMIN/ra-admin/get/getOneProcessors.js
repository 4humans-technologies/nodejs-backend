const Coupon = require("../../../../models/management/coupon")

exports.getCoupon = (req, res, next, id) => {
  Coupon.aggregate([
    {
      $match: { _id: id },
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
  ])
    .then((record) => {
      if (record) {
        return res.status(200).json({
          id: record._id,
          ...record,
        })
      } else {
        const error = new Error(
          "The requested Coupon was not found, Invalid Id"
        )
        error.statusCode = 422
        throw error
      }
    })
    .catch((err) => next(err))
}
