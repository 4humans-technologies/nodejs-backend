const Coupon = require("../../models/management/coupon")
// const Viewer = require("../../models/userTypes/Viewer")
const Wallet = require("../../models/globals/wallet")

exports.redeemCouponCode = (req, res, next) => {
  const { code } = req.body

  if (req.user.userType !== "Viewer") {
    return res.status(400).json({
      actionStatus: "failed",
      message: "Only viewers are allowed to redeem the code.",
    })
  }

  let theCoupon
  let walletModified = false

  Coupon.findOne({
    code: code,
    redeemed: false,
  })
    .lean()
    .then((coupon) => {
      if (coupon) {
        /**
         * transfer amount to the wallet and update coupon redeem status
         */
        theCoupon = coupon
        return Promise.all([
          Coupon.updateOne(
            {
              _id: coupon._id,
            },
            {
              redeemed: true,
              redeemedBy: req.user._id,
              redeemDate: new Date(),
            }
          ),
          Wallet.findOneAndUpdate(
            {
              relatedUser: req.user.relatedUser._id,
            },
            {
              $inc: { currentAmount: coupon.forCoins },
            },
            {
              new: true,
            }
          ).lean(),
        ])
      }
      const error = new Error(
        "Your coupon code was not redeemed!, The code was invalid."
      )
      error.statusCode = 400
      throw error
    })
    .then((values) => {
      if (values?.[1]) {
        walletModified = true
      }
      if (values[0].n === 1) {
        return res.status(200).json({
          actionStatus: "success",
          message: `${theCoupon.forCoins} coins were added successfully to your wallet`,
          wallet: values[1],
        })
      } else {
        const error = new Error(
          "Your coupon code was not redeemed! Error occurred on the server"
        )
        error.statusCode = 400
        throw error
      }
    })
    .catch((err) => {
      /* undo all other activity */
      if (theCoupon) {
        /* ========= */
        Promise.all([
          Coupon.updateOne(
            {
              _id: theCoupon._id,
            },
            {
              redeemed: false,
              redeemedBy: null,
              redeemDate: null,
            }
          ),
          Wallet.updateOne(
            {
              relatedUser: req.user.relatedUser._id,
            },
            {
              $inc: { currentAmount: walletModified ? -theCoupon.forCoins : 0 },
            }
          ),
        ])
          .then((result) => {
            if (result[0].n + result[1].n) {
              console.error("Code redeem failed, error in rolling back")
            }
            return next(err)
          })
          .catch(() => next(err))
      } else {
        /* no coupon was found */
        return res.status(err.statusCode).json({
          actionStatus: "failed",
          message: err.message,
        })
      }
    })
}
