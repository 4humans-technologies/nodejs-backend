// root
const Role = require("../../../../models/Role")
const Permission = require("../../../../models/Permission")

// userTypes
const Model = require("../../../../models/userTypes/Model")
const Viewer = require("../../../../models/userTypes/Viewer")
const Staff = require("../../../../models/userTypes/Staff")

// management
const Approval = require("../../../../models/management/approval")
const Tag = require("../../../../models/management/tag")
const PriceRange = require("../../../../models/management/priceRanges")
const Coupon = require("../../../../models/management/coupon")
const PrivateChatPlan = require("../../../../models/management/privateChatPlan")

// globals
const AudioCall = require("../../../../models/globals/audioCall")
const VideoCall = require("../../../../models/globals/videoCall")
const CoinSpendHistory = require("../../../../models/globals/coinsSpendHistory")
const CoinPurchase = require("../../../../models/globals/coinPurchase")
const ImageAlbum = require("../../../../models/globals/ImageAlbum")
const VideoAlbum = require("../../../../models/globals/VideosAlbum")
const Stream = require("../../../../models/globals/Stream")
const ModelDocuments = require("../../../../models/globals/modelDocuments")

// log
const Log = require("../../../../models/log/log")

// function imports
const paginator = require("../../../../utils/paginator")

const createModel = require("./createModel")
const createViewer = require("./createViewer")

const createProcessors = require("./createProcessors")

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
      })
        .save()
        .then((tag) => {
          return {
            createdResources: tag._doc,
            logMsg: `Tag '${tag.name}' was created!`,
          }
        })
      break
    case "Approval":
      createQuery = Approval({
        forModel: data.forModel,
        roleDuringApproval: req.user.role,
        by: req.user._id,
        remarks: data.remarks,
      }).save()
      break
    case "Role":
      /**
       *
       */
      createQuery = createProcessors(Role, req, res, next, {
        requiredModels: {
          Permission: Permission,
        },
      })

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
          return {
            createdResources: coupon._doc,
            logMsg: `A coupon for : ${data.forCoins} was created`,
          }
        })
      break
    case "PrivateChatPlan":
      createQuery = PrivateChatPlan({
        name: data.name,
        description: data.description,
        validityDays: data.validityDays,
        price: data.price,
        status: data.status,
        createdBy: "61da8ea900622555940aacb7",
      })
        .save()
        .then((chatPlan) => {
          return {
            createdResources: chatPlan._doc,
            logMsg: `Chat plan ${chatPlan.name} was created, `,
          }
        })
      break
    default:
      break
  }

  createQuery
    .then(({ createdResources, logMsg }) => {
      return Promise.all([
        createdResources,
        Log({
          msg: logMsg,
          by: "61da8ea900622555940aacb7",
        }).save(),
      ])
    })
    .then(([createdResources]) => {
      /**
       * add a log entry also after  successful creation of a record
       */
      return res
        .status(201)
        .json({ id: createdResources._id, ...createdResources })
    })
    .catch((err) => next(err))
}
