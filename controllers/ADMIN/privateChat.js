const PrivateChatPlan = require("../../models/management/privateChatPlan")
const errorCollector = require("../../utils/controllerErrorCollector")
const { Types } = require("mongoose")

exports.createNewChatPlan = (req, res, next) => {
  /* check in production that only admin can create this */
  errorCollector(req)

  const { name, description, validityDays, price } = req.body

  PrivateChatPlan({
    name,
    description,
    validityDays,
    price,
    createdBy: Types.ObjectId(),
  })
    .save()
    .then((plan) => {
      res.status(200).json({
        actionStatus: "success",
        plan: plan,
      })
    })
    .catch((err) => next(err))
}

exports.getActiveChatPlans = (req, res, next) => {
  errorCollector(req)

  PrivateChatPlan.find({
    status: "active",
  })
    .then((plans) => {
      return res.status(200).json({
        actionStatus: "success",
        plans: plans,
      })
    })
    .catch((err) => next(err))
}
