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
          by: req.user.userId,
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
          by: req.user.userId,
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
  delete relatedUser.followers
  delete relatedUser.currentStream
  delete relatedUser.isStreaming
  delete relatedUser.onCall
  delete relatedUser.numberOfFollowers
  delete relatedUser.pendingCalls
  delete relatedUser.privateChats
  delete relatedUser.streams
  delete relatedUser.audioCallHistory
  delete relatedUser.videoCallHistory

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
          by: req.user.userId,
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
          by: req.user.userId,
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
        by: req.user.userId,
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
          msg: `Model @${updatedResource.rootUser.username} was Approved by ${req.user.username}`,
          by: req.user.userId,
        }).save(),
      ])
    })
    .then(([updatedResources, log]) => {
      console.log(log.msg)
      return res.status(200).json(updatedResources)
    })
}

exports.updateStaff = (Staff, req, res, options) => {
  const {
    rootUser: { _id: rootUserId, ...rootUser },
    ...staff
  } = req.body

  const staffId = staff._id

  delete staff._id
  delete rootUser.permissions

  const Role = options.requiredModels.Role
  const User = options.requiredModels.User

  let theRole
  return Role.findOne({
    _id: req.body.rootUser.role,
  })
    .lean()
    .then((role) => {
      theRole = role
      return Promise.all([
        Staff.findOneAndUpdate(
          {
            _id: staffId,
          },
          {
            $set: staff,
          },
          {
            new: true,
          }
        ).lean(),
        User.findOneAndUpdate(
          {
            _id: rootUserId,
          },
          {
            $set: {
              permissions: role.permissions,
              ...rootUser,
            },
          },
          {
            new: true,
          }
        ).lean(),
      ])
    })
    .then(([staff, user]) => {
      staff = {
        ...staff,
        rootUser: {
          ...user,
          role: theRole,
        },
      }
      return Promise.all([
        staff,
        Log({
          msg: `Staff ${user.username} was updated by, ${req.user.username}`,
          by: req.user.userId,
        }).save(),
      ])
    })
    .then(([staff]) => {
      return res.status(200).json({
        id: staff._id,
        ...staff,
      })
    })
}

exports.updateViewer = (Viewer, req, res, options) => {
  const {
    wallet: { _id: walletId, ...wallet },
    rootUser: { _id: rootId, meta, createdAt, ...rootUser },
    ...rltdUser
  } = req.body

  const { id, _id: relatedId, ...relatedUser } = rltdUser

  const User = options.requiredModels.User
  const Wallet = options.requiredModels.Wallet

  return Promise.all([
    Viewer.findOneAndUpdate(
      {
        _id: relatedId,
      },
      {
        $set: relatedUser,
      },
      { new: true }
    ).lean(),
    User.findOneAndUpdate(
      {
        _id: rootId,
      },
      {
        $set: rootUser,
      },
      { new: true }
    ).lean(),
    Wallet.findOneAndUpdate(
      {
        _id: walletId,
      },
      {
        $set: wallet,
      },
      { new: true }
    ).lean(),
  ])
    .then(([viewer, user, wallet]) => {
      viewer = {
        ...viewer,
        rootUser: {
          ...user,
        },
        wallet: wallet,
      }
      return Promise.all([
        viewer,
        Log({
          msg: `Viewer ${user.username} was updated successfully by, ${req.user.username}`,
          by: req.user.userId,
        }).save(),
      ])
    })
    .then(([viewer]) => {
      return res.status(200).json({
        id: viewer._id,
        ...viewer,
      })
    })
}
