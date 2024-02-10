const Coupon = require("../../models/management/coupon")

exports.generateNewCouponCode = (req, res, next) => {
  const { forCoins } = req.body

  if (forCoins < 10) {
    return res.status(400).json({
      actionStatus: "failed",
      message: "Please enter a value greater than or equal to 10",
    })
  }

  Coupon({
    generatedBy: req.user.relatedUser,
    forCoins: +forCoins,
    createdAt: new Date(),
  })
    .save()
    .then((coupon) => {
      return res.status(200).json({
        actionStatus: "success",
        code: coupon.code,
        forCoins: coupon.forCoins,
      })
    })
    .catch((err) => next(err))
}

exports.acknowledgeCouponCode = (req, res, next) => {
  const { id } = req.body

  Coupon.updateOne(
    {
      _id: id,
    },
    {
      acknowledged: true,
    }
  )
    .then((result) => {
      res.status(200).json({
        actionStatus: "success",
      })
    })
    .catch((err) => next(err))
}
