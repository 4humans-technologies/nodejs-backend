// root
const Role = require("../../../../models/Role")
const Permission = require("../../../../models/Permission")

// userTypes
const Model = require("../../../../models/userTypes/Model")
const Viewer = require("../../../../models/userTypes/Viewer")
const Staff = require("../../../../models/userTypes/Staff")
const User = require("../../../../models/User")

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
const bcrypt = require("bcrypt")

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

  var createQuery, options
  switch (resource) {
    case "Model":
      /**
       * create new model
       */

      if (data.rootUser.password !== data.rootUser.conformation) {
        createQuery = Promise.resolve("Passwords do not match!")
        break
      }

      createQuery = bcrypt
        .genSalt(5)
        .then((salt) => {
          return bcrypt.hash(data.rootUser.password, salt)
        })
        .then((hashedPassword) => {
          data.rootUser.password = hashedPassword
          req.body.rootUser.password = hashedPassword
          delete data.rootUser.conformation
          return createModel(data, req)
        })
      break
    case "Viewer":
      if (data.rootUser.password !== data.rootUser.conformation) {
        createQuery = Promise.resolve("Passwords do not match!")
        break
      }

      createQuery = bcrypt
        .genSalt(5)
        .then((salt) => {
          return bcrypt.hash(data.rootUser.password, salt)
        })
        .then((hashedPassword) => {
          data.rootUser.password = hashedPassword
          req.body.rootUser.password = hashedPassword
          delete data.rootUser.conformation
          return createViewer(data, req)
        })
      break
    case "Tag":
      createQuery = Tag({
        name: data.name,
      })
        .save()
        .then((tag) => {
          return {
            createdResource: tag._doc,
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
      createQuery = createProcessors.createRole(Role, req, res, next, {
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
        generatedBy: req.user.userId,
        forCoins: data.forCoins,
      })
        .save()
        .then((coupon) => {
          return {
            createdResource: coupon._doc,
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
        createdBy: req.user.userId,
      })
        .save()
        .then((chatPlan) => {
          return {
            createdResource: chatPlan._doc,
            logMsg: `Chat plan ${chatPlan.name} was created, `,
          }
        })
      break
    case "Staff":
      if (data.rootUser.password !== data.rootUser.conformation) {
        createQuery = Promise.resolve("Passwords do not match!")
        break
      }

      createQuery = bcrypt
        .genSalt(5)
        .then((salt) => {
          return bcrypt.hash(data.rootUser.password, salt)
        })
        .then((hashedPassword) => {
          data.rootUser.password = hashedPassword
          req.body.rootUser.password = hashedPassword
          delete data.rootUser.conformation
          return createProcessors.createStaff(Staff, req, res, next, {
            requiredModels: {
              User: User,
              Role: Role,
            },
          })
        })

      break
    default:
      console.log("Default case reached for ", resource)
      break
  }

  return createQuery
    .then(({ createdResource, logMsg }) => {
      return Promise.all([
        createdResource,
        Log({
          msg: logMsg,
          by: req.user.userId,
        }).save(),
      ])
    })
    .then(([createdResource]) => {
      /**
       * add a log entry also after  successful creation of a record
       */
      return res
        .status(201)
        .json({ id: createdResource._id, ...createdResource })
    })
    .catch((err) => next(err))
}
