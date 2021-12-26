const Model = require("../../../../models/userTypes/Model")
const Viewer = require("../../../../models/userTypes/Viewer")
const Staff = require("../../../../models/userTypes/Staff")
const SuperAdmin = require("../../../../models/userTypes/SuperAdmin")
const Approval = require("../../../../models/management/approval")
const Tag = require("../../../../models/management/tag")
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

  /**
   * generate sort string
   */

  sort = sortArray.join(" ")

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
        },
        {
          path: "wallet",
          select: "currentAmount",
        },
        {
          path: "tag",
          select: "name",
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
  }

  return paginator
    .withConditionAndSendTheResponse(
      model,
      {
        skip: skip,
        sort: sort,
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
