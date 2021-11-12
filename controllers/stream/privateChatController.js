const Model = require("../../models/userTypes/Model")
const Viewer = require("../../models/userTypes/Viewer")
const ModelViewerPrivateChat = require("../../models/ModelViewerPrivateChat")
const Wallet = require("../../models/globals/wallet")
const errorCollector = require("../../utils/controllerErrorCollector")
const PrivateChatPlan = require("../../models/management/privateChatPlan")

exports.createNewModelViewerChat = (req, res, next) => {
  /* right now only viewer will be able to create it */
}

exports.getPrivateChatById = (req, res, next) => {
  const { dbChatId } = req.body

  if (req.user.userType === "Model") {
    ModelViewerPrivateChat.findOne({
      _id: dbChatId,
    })
      .populate({
        path: "viewer",
        select: "name profileImage rootUser",
        populate: {
          path: "rootUser",
          select: "username",
        },
      })
      .lean()
      .then((chat) => {
        if (
          chat &&
          chat.model._id.toString() === req.user.relatedUser._id.toString()
        ) {
          res.status(200).json({
            actionStatus: "success",
            privateChat: chat,
          })
        } else {
          res.status(200).json({
            actionStatus: "failed",
            message: "This chat belongs to other model",
          })
        }
      })
      .catch((err) => next(err))
  } else if (req.user.userType === "Viewer") {
    ModelViewerPrivateChat.findOne({
      _id: dbChatId,
    })
      .populate({
        path: "viewer",
        select: "name profileImage rootUser",
        populate: {
          path: "rootUser",
          select: "username",
        },
      })
      .lean()
      .then((chat) => {
        if (chat) {
          /* if this chat belongs to him and has active chat plan */
          if (
            chat.model_id === req.relatedUser._id &&
            req.user.relatedUser.isChatPlanActive &&
            new Date(
              req.user.relatedUser.currentChatPlan.willExpireOn
            ).getTime() >
              Date.now() + 10000
          ) {
            return res.status(200).json({
              actionStatus: "success",
              privateChat: chat,
            })
          } else {
            if (
              req.user.relatedUser.isChatPlanActive &&
              new Date(
                req.user.relatedUser.currentChatPlan.willExpireOn
              ).getTime() <
                Date.now() + 10000
            ) {
              /* this user ha expired chat plan, deactivate his plan and update */
              return Viewer.findOneAndUpdate(
                {
                  _id: req.user.relatedUser._id,
                },
                {
                  isChatPlanActive: false,
                  currentChatPlan: null,
                  $push: {
                    previousChatPlans: {
                      planId: req.user.relatedUser.currentChatPlan.planId,
                      purchasedOn:
                        req.user.relatedUser.currentChatPlan.purchasedOn,
                    },
                  },
                }
              )
                .then((viewer) => {
                  return res.status(200).json({
                    actionStatus: "failed",
                    message: "You dont have active chat plan",
                  })
                })
                .catch((err) => next(err))
            } else if (chat.model_id === req.relatedUser._id) {
              return res.status(200).json({
                actionStatus: "failed",
                message: "This chat belongs to other viewer",
              })
            }
          }
        } else {
          /* no chat with this id found */
          const error = new Error("no chat found")
          error.statusCode = 400
          throw error
        }
      })
      .catch((err) => next(err))
  }
}

exports.findOrCreatePrivateChat = (req, res, next) => {
  const { modelId, viewerId } = req.body

  if (
    req.user.userType === "Viewer" &&
    !req.user.relatedUser.isChatPlanActive
  ) {
    /* if viewer has no active chat plan */
    return res.status(200).json({
      actionStatus: "failed",
      message: "no active chat plan",
    })
  }

  const query =
    req.user.userType === "Model"
      ? ModelViewerPrivateChat.findOne({
          viewer: viewerId,
          model: modelId,
        })
          .populate({
            path: "viewer",
            select: "name profileImage rootUser",
            populate: {
              path: "rootUser",
              select: "username",
            },
          })
          .lean()
      : ModelViewerPrivateChat.findOne({
          viewer: viewerId,
          model: modelId,
        }).lean()

  query
    .then((chat) => {
      if (!chat) {
        /* create new chat entry */
        ModelViewerPrivateChat({
          viewer: viewerId,
          model: modelId,
          quickFindIndex: `${modelId}_${viewerId}`,
          chats: [],
        })
          .save({})
          .then((privateChat) => {
            return res.status(200).json({
              actionStatus: "success",
              privateChat: privateChat,
              newlyCreated: true,
            })
          })
          .catch((err) => next(err))
      } else {
        return res.status(200).json({
          actionStatus: "success",
          privateChat: chat,
        })
      }
    })
    .catch((err) => next(err))
}

exports.getPrivateChatByQuickFindIndex = (req, res, next) => {
  const { quickFindIndex, dbChatId } = req.body

  const query =
    by === "id"
      ? ModelViewerPrivateChat.findOne({
          _id: dbChatId,
        })
      : ModelViewerPrivateChat.findOne({
          quickFindIndex: quickFindIndex,
        }).lean()

  query
    .then((chat) => {
      if (chat) {
        return res.status(200).json({
          actionStatus: "success",
          privateChat: chat,
        })
      } else {
        return res.status(200).json({
          actionStatus: "success",
          privateChat: null,
        })
      }
    })
    .catch((err) => next(err))
}

exports.buyChatPlanForViewer = (req, res, next) => {
  errorCollector(req)

  const { planId } = req.body

  PrivateChatPlan.findById(planId)
    .select("name status price ")
    .lean()
    .then((plan) => {
      if (plan && plan.status === "active") {
        if (req.user.relatedUser.wallet.currentAmount >= plan.price) {
          return Promise.all([
            Wallet.updateOne(
              {
                relatedUser: req.user.relatedUser,
              },
              {
                currentAmount:
                  req.user.relatedUser.wallet.currentAmount - plan.price,
              }
            ),
            /* add amount in admin wallet also */
          ])
        } else {
          /* not have suffecient ammt of money */
          const error = new Error(
            "You don't have suffecient coins in wallet to purchase this plan"
          )
          error.statusCode = 400
          throw error
        }
      } else {
        const error = new Error("Invalid plan!")
        error.statusCode = 400
        throw error
      }
    })
    .then((values) => {
      if (values[0].n === 1) {
        /* buy plan  */
        return Viewer.FindOneAndUpdate(
          {
            _id: req.user.relatedUser,
          },
          {
            isChatPlanActive: true,
            currentChatPlan: {
              planId: planId,
              willExpireOn: validityDays * 24 * 3600 * 1000 + Date.now(),
              purchasedOn: new Date(),
            },
          },
          {
            new: true,
          }
        ).lean()
      }
    })
    .then((updatedViewer) => {
      return res.status(200).json({
        actionStatus: "success",
        updatedViewer: updatedViewer,
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
