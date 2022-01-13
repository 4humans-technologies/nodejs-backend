const Log = require("../../../../models/log/log")

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

  return Promise.all([
    Viewer.findOneAndUpdate(
      {
        _id: id,
      },
      {
        $set: relatedUser,
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
    .then(([model, user, wallet]) => {
      const updatedResource = {
        id: model._id,
        ...model._doc,
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

exports.updateChatPlan = (PrivateChatPlan, req, res, options) => {
  const { id, _id, ...plan } = req.body

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
