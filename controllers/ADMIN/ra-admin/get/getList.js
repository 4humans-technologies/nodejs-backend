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

// function imports
const paginator = require("../../../../utils/paginator")
const listProcessors = require("./getListProcessers")

module.exports = (req, res, next) => {
  /**
   * GET http://path.to.my.api/posts?sort=["title","ASC"]&range=[0, 4]&filter={"author_id":12}
   */
  /**
   * expected to get
   * sort, range & filter parameters in the query
   */
  /**
     * const { page, perPage } = params.pagination;
        const { field, order } = params.sort;
        const query = {
            sort: JSON.stringify([field, order]),
            range: JSON.stringify([(page - 1) * perPage, page * perPage - 1]),
            filter: JSON.stringify(params.filter),
        }
     */

  const { resource } = req.params

  var range = JSON.parse(req.query.range || "[0, 25]")
  var sort = JSON.parse(req.query.sort || "[]")
  var filter = JSON.parse(req.query.filter || "{}")

  // const sortArray = []
  // sort.forEach((entry, index) => {
  //   if ((index + 1) % 2 === 1) {
  //     return
  //   }
  //   sortArray.push(entry === "ASC" ? sort[index - 1] : `-${sort[index - 1]}`)
  // })
  // sort = sortArray.join(" ")

  /**
   * if sort on multiple can use below one down 👇
   */

  const sortObj = {}
  sort.forEach((entry, index) => {
    if ((index + 1) % 2 === 1) {
      return
    }
    sortObj[sort[index - 1]] = entry === "ASC" ? 1 : -1
  })

  sort = sortObj

  const limit = range[1] - range[0]
  const skip = range[0]

  var select, populate, model, processWith, processorFunc, processorOptions
  switch (resource) {
    case "UnApprovedModel":
      processWith = "custom"
      processorFunc = listProcessors.getUnApprovedModels
      processorOptions = {
        requiredModels: {
          User: User,
        },
      }
      break
    case "Model":
      processWith = "custom"
      processorFunc = listProcessors.getModel
      processorOptions = {}
      break
    case "Viewer":
      processWith = "custom"
      processorFunc = listProcessors.getViewerList
      processorOptions = {}
      break
    case "Tag":
      processWith = "normal"
      model = Tag
      select = "name createdAt updatedAt"
      populate = []
      break
    case "Approval":
      model = Approval
      select =
        "forModel by remark approvalTime roleDuringApproval createdAt updatedAt"
      populate = [
        {
          path: "forModel",
          select: "username relatedUser createdAt",
          populate: {
            path: "relatedUser",
            select: "name profileImage email phone gender",
          },
        },
        {
          path: "by",
          select: "username role relatedUser createdAt",
          populate: {
            path: "relatedUser",
            select: "name profileImage email phone gender",
          },
        },
      ]
      break
    case "Coupon":
      processWith = "custom"
      processorFunc = listProcessors.getCouponList
      processorOptions = {}
      break
    case "CoinSpendHistory":
      processWith = "custom"
      processorFunc = listProcessors.getCoinSpendHistories
      processorOptions = {}
      break
    case "PrivateChatPlan":
      processWith = "normal"
      select = "name description validityDays price status createdBy createdAt"
      populate = [
        {
          path: "createdBy",
          select: "username",
        },
      ]
      model = PrivateChatPlan
      break
    case "Role":
      processWith = "custom"
      processorFunc = listProcessors.getRoleList
      processorOptions = {}
      break
    case "Permission":
      processWith = "normal"
      model = Permission
      select = "value"
      populate = []
      break
    default:
      console.error("Default case for 'getList' reached!")
      break
  }

  if (processWith === "custom") {
    return processorFunc(req, res, next, {
      sort: sort,
      match: filter,
      skip: skip,
      limit: limit,
      range: range,
      ...processorOptions,
    })
  } else if (processWith === "normal") {
    return paginator
      .withConditionAndSendTheResponse(
        model,
        {
          skip: skip || 0,
          sort: sort || "",
          limit: limit || 24,
          range: range,
          populate: populate,
          select: select,
          filter: filter,
        },
        req,
        res,
        Model
      )
      .catch((err) => next(err))
  }
}
