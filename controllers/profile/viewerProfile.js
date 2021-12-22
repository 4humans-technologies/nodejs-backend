const Viewer = require("../../models/userTypes/Viewer")
const Model = require("../../models/userTypes/Model")
const Wallet = require("../../models/globals/wallet")
const CoinsSpendHistory = require("../../models/globals/coinsSpendHistory")
const paginator = require("../../utils/paginator")


exports.getFollowedModelDetails = (req, res, next) => {
  Viewer.findById(req.user.relatedUser._id)
    .select("following")
    .populate({
      path: "following",
      select: "username profileImage rootUser",
      populate: {
        path: "rootUser",
        select: "username -_id",
        options: { lean: true },
      },
      options: { lean: true },
    })
    .lean()
    .then((viewer) => {
      return res.status(200).json({
        actionStatus: "success",
        models: viewer.following.map((model) => ({
          ...model,
          username: model.rootUser.username,
          rootUser: undefined,
        })),
      })
    })
    .catch((err) => next(err))
}

exports.coinsHistory = (req, res, next) => {
  const query = { by: req.user.relatedUser._id }

  paginator
    .withNormal(CoinsSpendHistory, query, null, req, res, {
      path: "forModel",
      select: "rootUser profileImage",
      populate: {
        path: "rootUser",
        select: "username",
        options: { lean: true },
      },
    })
    .catch((err) => next(err))
}

exports.updateProfileInfo = (req, res, next) => {
  let fieldsToUpdate = {}

  req.body.forEach((field) => {
    fieldsToUpdate[field.field] = field.value
  })

  Viewer.updateOne(
    {
      _id: req.user.relatedUser._id,
    },
    { $set: fieldsToUpdate },
    { runValidators: true }
  )
    .then(() => {
      return res.status(200).json({
        actionStatus: "success",
        updatedFields: Object.keys(fieldsToUpdate),
      })
    })
    .catch((err) => next(err))
}

exports.getTokenHistoryOfModel = (req, res, next) => {
  CoinsSpendHistory.find({
    by: req.user.relatedUser._id,
  })
    .populate({
      path: "forModel",
      select: "name profileImage -_id",
      populate: [
        {
          path: "rootUser",
          select: "username -_id",
          options: { lean: true },
        },
      ],
    })

    .lean()
    .then((history) => {
      return res.status(200).json({
        actionStatus: "success",
        results: history,
      })
    })
    .catch((err) => next(err))
}
