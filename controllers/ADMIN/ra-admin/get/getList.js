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

  const sortArray = []
  sort.forEach((entry, index) => {
    if ((index + 1) % 2 === 1) {
      return
    }
    sortArray.push(entry === "ASC" ? sort[index - 1] : `-${sort[index - 1]}`)
  })
  sort = sortArray.join(" ")

  /**
   * if sort on multiple can use below one down 👇
   */

  // const sortObj = {}
  // sort.forEach((entry, index) => {
  //   if ((index + 1) % 2 === 1) {
  //     return
  //   }
  //   sortObj[sort[index - 1]] = entry === "ASC" ? 1 : -1
  // })

  // let sortObj = { [`${sort[0]}`]: sort[1] === "ASC" ? 1 : -1 }

  /**
   * generate sort string
   */

  const limit = range[1] - range[0]
  const skip = range[0]

  var select, populate, model
  switch (resource) {
    case "Model":
      model = Model
      select =
        "rootUser numberOfFollowers approval name gender email dob languages tags ethnicity hairColor eyeColor bodyType skinColor callActivity dynamicFields tipMenuActions sharePercent charges minCallDuration rating isStreaming profileImage wallet"
      populate = [
        {
          path: "rootUser",
          select: "username userType needApproval meta inProcessDetails",
          sort: sort.includes("rootUser.") ? sort : undefined,
        },
        {
          path: "wallet",
          select: "currentAmount",
          sort: sort.includes("wallet.") ? sort : undefined,
        },
        {
          path: "tag",
          select: "name",
          sort: sort.includes("tag.") ? sort : undefined,
        },
        {
          path: "approval",
          select: "name",
        },
      ]
      break
    case "Viewer":
      model = Viewer
      select = "name profileImage isChatPlanActive"
      populate = [
        {
          path: "rootUser",
          select: "username userType needApproval meta inProcessDetails",
        },
        {
          path: "wallet",
          select: "currentAmount",
        },
      ]
      break
    case "Tag":
      model = Tag
      select = "name"
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
      model = Coupon
      select = "generatedBy code forCoins redeemed redeemedBy redeemDate"
      populate = [
        {
          path: "generatedBy",
          select: "name",
          populate: {
            path: "rootUser",
            select: "username",
          },
        },
        {
          path: "redeemedBy",
          select: "name",
          populate: {
            path: "rootUser",
            select: "username",
          },
        },
      ]
      break
  }

  return paginator
    .withConditionAndSendTheResponse(
      model,
      {
        skip: skip,
        sort: sort.includes(".") ? undefined : sort,
        limit: limit,
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
