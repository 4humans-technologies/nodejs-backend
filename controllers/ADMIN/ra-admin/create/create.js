const Model = require("../../../../models/userTypes/Model")
const Viewer = require("../../../../models/userTypes/Viewer")
const Staff = require("../../../../models/userTypes/Staff")
const Approval = require("../../../../models/management/approval")
const Tag = require("../../../../models/management/tag")
const Role = require("../../../../models/Role")
const Permission = require("../../../../models/Permission")
const Log = require("../../../../models/log/log")
const Coupon = require("../../../../models/management/coupon")

const createModel = require("./createModel")
const createViewer = require("./createViewer")

module.exports = (req, res, next) => {
  /**
   * create a new resource, with post request
   */

  /**
   * dataProvider.create('posts', { data: { title: "hello, world" } });
   */

  const { resource } = req.params
  const data = req.body

  var createQuery
  switch (resource) {
    case "Model":
      /**
       * create new model
       */
      createQuery = createModel(data, req)
      break
    case "Viewer":
      /**
       * create new viewer
       */
      createQuery = createViewer(data, req)
      break
    case "Tag":
      createQuery = Tag({
        name: data.name,
      }).save()
      break
    case "Approval":
      Approval({
        forModel: data.forModel,
        roleDuringApproval: req.user.role,
        by: req.user._id,
        remarks: data.remarks,
      })
      break
    case "Role":
      /**
       *
       */
      break
    case "Coupon":
      /**
       * can put check on the max "coin value" generation by that staff
       */
      createQuery = Coupon({
        generatedBy: "61da8ea900622555940aacb7",
        forCoins: data.forCoins,
      })
        .save()
        .then((coupon) => {
          return coupon
          //   return Coupon.aggregate([
          //     {
          //       $match: { _id: coupon._id },
          //     },
          //     {
          //       $lookup: {
          //         from: "users",
          //         foreignField: "_id",
          //         localField: "generatedBy",
          //         as: "generatedBy",
          //       },
          //     },
          //     {
          //       $unwind: "$generatedBy",
          //     },
          //     {
          //       $lookup: {
          //         from: "users",
          //         foreignField: "_id",
          //         localField: "redeemedBy",
          //         as: "redeemedBy",
          //       },
          //     },
          //     {
          //       $unwind: "$rootUser",
          //     },
          //     {
          //       $project: {
          //         _id: 0,
          //         id: "$_id",
          //         generatedBy: 1,
          //         code: 1,
          //         forCoins: 1,
          //         redeemed: 1,
          //         redeemedBy: 1,
          //         redeemDate: 1,
          //       },
          //     },
          //   ])
        })
        .then((coupon) => {
          return {
            createdResources: coupon._doc,
            logField: "coin value",
            logFieldValue: data.forCoins,
          }
        })
      break
    default:
      break
  }

  createQuery
    .then(({ createdResources, logField, logFieldValue }) => {
      /**
       * expecting "logField" & "logFieldValue" in the result
       * to construct proper log string
       */
      return Promise.all([
        createdResources,
        // Log({
        //   action: `create new ${resource}, with ${logField}: ${logFieldValue}`,
        //   by: req.user._id,
        // }).save(),
      ])
    })
    .then(([createdResources, _log]) => {
      /**
       * add a log entry also after  successful creation of a record
       */
      return res
        .status(201)
        .json({ id: createdResources._id, ...createdResources })
    })
    .catch((err) => next(err))
}
