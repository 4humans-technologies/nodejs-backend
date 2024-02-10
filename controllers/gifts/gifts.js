const controllerErrorCollector = require("../../utils/controllerErrorCollector")
const paginator = require("../../utils/paginator")
const Gift = require("../../models/globals/Gift")
const Viewer = require("../../models/userTypes/Viewer")
const Wallet = require("../../models/globals/wallet")

exports.getGifts = (req, res, next) => {
  const qry = {}
  paginator.withNormal(Gift, qry, "", req, res).catch((err) => next(err))
}

exports.handleGiftPurchase = (req, res, next) => {
  const { giftId } = req.body

  if (req.user.userType === "Model") {
    const error = new Error("Model cannot purchase gifts")
    next(error)
  }

  Viewer.findById(req.user.relatedUser._id)
    .lean()
    .select("wallet")
    .then((viewer) => {
      return Promise.all([
        Wallet.findById(viewer.wallet._id).select("currentAmount"),
        Gift.findById(giftId).lean().select("price"),
      ])
    })
    .then((values) => {
      if (values[0].currentAmount < values[1].price) {
        const error = new Error(
          "You are poor and hence not able to buy this gift, get rich first 😎😎"
        )
        error.statusCode = 400
        throw error
      }
      return Wallet.findByIdAndUpdate(
        { _id: values[0]._id },
        {
          currentAmount: values[0].currentAmount - values[1].price,
        },
        { new: true }
      )
    })
    .then((wallet) => {
      res.status(200).json({
        actionStatus: "success",
        message: "gift purchased successFully",
        walletAmount: wallet.currentAmount,
      })
    })
    .catch((err) => next(err))
}
