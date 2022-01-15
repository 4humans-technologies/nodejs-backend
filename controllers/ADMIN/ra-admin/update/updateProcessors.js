const Log = require("../../../../models/log/log")
const ObjectId = require("mongodb").ObjectId

exports.updateTag = (Tag, req, res, options) => {
  /**
   * 1 - update tag name
   * 2 - update all the models with that tag
   */

  const data = req.body

  const Model = options.requiredModels.Model

  var name
  return Tag.findById(data.id)
    .lean()
    .then((tag) => {
      name = tag.name
      return Promise.all([
        Tag.findOneAndUpdate(
          {
            _id: data.id,
          },
          {
            name: data.name,
          },
          {
            new: true,
          }
        ),
        Model.updateMany(
          {
            tags: name,
          },
          {
            $set: { "tags.$": data.name },
          }
        ),
      ])
    })
    .then(([tag, result]) => {
      return Promise.all([
        tag,
        Log({
          msg: `Updated ${result.nModified} models tag :${name} was updated to ${tag.name}`,
          by: "61da8ea900622555940aacb7",
        }).save(),
      ])
    })
    .then(([tag]) => {
      return res.status(200).json({
        id: tag._id,
        ...tag,
      })
    })
}

exports.updateViewer = (Viewer, req, res, options) => {
  const User = options.requiredModels.User
  const Wallet = options.requiredModels.wallet

  const { id, rootUser, wallet, ...relatedUser } = req.body
  const unset = {}

  if (!relatedUser.isChatPlanActive && relatedUser.currentChatPlan) {
    /**
     * admin removed the plan from viewer
     */
    unset["currentChatPlan"] = 1
  }

  return Promise.all([
    Viewer.findOneAndUpdate(
      {
        _id: id,
      },
      {
        $set: relatedUser,
        $unset: unset,
      },
      {
        new: true,
      }
    ),
    User.findOneAndUpdate(
      {
        _id: rootUser._id,
      },
      {
        $set: rootUser,
      },
      {
        new: true,
      }
    ),
    Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
      },
      {
        $set: wallet,
      },
      {
        new: true,
      }
    ),
  ])
    .then(([viewer, user, wallet]) => {
      const updatedResource = {
        id: viewer._id,
        ...viewer._doc,
        rootUser: {
          ...user._doc,
        },
        wallet: {
          ...wallet._doc,
        },
      }

      return Promise.all([
        updatedResource,
        Log({
          msg: `Model @${user.username} was updated successfully!`,
          by: "61da8ea900622555940aacb7",
        }).save(),
      ])
    })
    .then(([updatedResource]) => {
      return res.status(200).json(updatedResource)
    })
}

exports.updateModel = (Model, req, res, options) => {
  const User = options.requiredModels.User
  const Wallet = options.requiredModels.Wallet

  const { id, rootUser, wallet, ...relatedUser } = req.body

  const rootId = rootUser._id
  const walletId = wallet._id

  /**
   * delete id because dont want to re-set _id
   */
  delete rootUser._id
  delete wallet._id
  delete relatedUser._id

  return Promise.all([
    Model.findOneAndUpdate(
      {
        _id: id,
      },
      {
        $set: relatedUser,
      },
      {
        new: true,
      }
    ).lean(),
    User.findOneAndUpdate(
      {
        _id: rootId,
      },
      {
        $set: rootUser,
      },
      {
        new: true,
      }
    ).lean(),
    Wallet.findOneAndUpdate(
      {
        _id: walletId,
      },
      {
        $set: wallet,
      },
      {
        new: true,
      }
    ).lean(),
  ])
    .then(([model, user, wallet]) => {
      const updatedResource = {
        id: model._id,
        ...model,
        rootUser: {
          ...user,
        },
        wallet: {
          ...wallet,
        },
      }

      return Promise.all([
        updatedResource,
        Log({
          msg: `Model @${user.username} was updated successfully!`,
          by: "61da8ea900622555940aacb7",
        }).save(),
      ])
    })
    .then(([updatedResource]) => {
      return res.status(200).json(updatedResource)
    })
}

exports.updateChatPlan = (PrivateChatPlan, req, res, options) => {
  const { id, _id, ...plan } = req.body

  delete plan._id

  return PrivateChatPlan.findOneAndUpdate(
    {
      _id: id,
    },
    {
      $set: plan,
    },
    {
      new: true,
    }
  )
    .lean()
    .then((chatPlan) => {
      return Promise.all([
        chatPlan,
        Log({
          msg: `Chat plan ${chatPlan.name} was updated successfully!`,
          by: "61da8ea900622555940aacb7",
        }).save(),
      ])
    })
    .then(([chatPlan]) => {
      return res.status(200).json({ id: chatPlan._id, ...chatPlan })
    })
}

exports.updateUnApprovedModel = (Model, req, res, options) => {
  const { rootUser, ...relatedUser } = req.body

  const User = options.requiredModels.User
  const Approval = options.requiredModels.Approval

  const rootId = rootUser._id

  delete rootUser._id
  delete relatedUser._id

  const modelUpdateObj = {
    $set: relatedUser,
  }

  const prArray = [
    Model.findOneAndUpdate(
      {
        _id: relatedUser._id,
      },
      modelUpdateObj
    ).lean(),
    User.findOneAndUpdate(
      {
        _id: rootId,
      },
      {
        $set: rootUser,
      }
    ).lean(),
  ]

  if (rootUser.needApproval) {
    var approvalId = ObjectId()
    modelUpdateObj["approval"] = approvalId

    prArray.push(
      Approval.create({
        _id: approvalId,
        forModel: relatedUser._id,
        roleDuringApproval: "noRoleYet",
        by: "61da8ea900622555940aacb7",
        remark: "This model is approved when admin was not properly setup",
      })
    )
  }

  if (relatedUser.approval) {
    /**
     * delete previous approval, if any
     */
    prArray.push(Approval.deleteOne(relatedUser._id))
  }

  return Promise.all(prArray)
    .then(([model, user, approval]) => {
      const updatedResource = {
        id: model._id,
        approval: approval._doc,
        ...model,
        rootUser: {
          ...user,
        },
      }

      return Promise.all([
        updatedResource,
        Log({
          // msg: `Model @${updatedResource.rootUser.username} was Approved by ${req.user.username}`,
          msg: `Model @${
            updatedResource.rootUser.username
          } was Approved by ${"61da8ea900622555940aacb7"}`,
          by: "61da8ea900622555940aacb7",
        }).save(),
      ])
    })
    .then(([updatedResources, log]) => {
      console.log(log.msg)
      return res.status(200).json(updatedResources)
    })
}
