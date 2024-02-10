// all small api's for composing the fronted plus
// the end point to get all the data to compose the dashboard

const Stream = require("../../models/globals/Stream")
const Tag = require("../../models/management/tag")
const TagGroup = require("../../models/management/tagGroup")
const Model = require("../../models/userTypes/Model")
const paginator = require("../../utils/paginator")
const io = require("../../socket")

const REJECTED_MODEL_IDS = ["61da89e6cdd8ebdb2a04d00e"]

exports.getStreamingModels = (req, res, next) => {
  // what about sorting order
  const qry = {
    isStreaming: true,
  }
  paginator.withNormal(Model, qry, null, req, res).catch((err) => next(err))
}

exports.getLiveStreams = (req, res, next) => {
  const query = {
    status: "ongoing",
  }
  paginator
    .withNormal(Stream, query, "model createdAt status", req, res)
    .catch((err) => next(err))
}

exports.getRankingOnlineModels = (req, res, next) => {
  /**
   * get all models live or offline
   */

  /* onCall or streaming */
  Model.aggregate([
    {
      $match: {
        _id: {
          $nin: REJECTED_MODEL_IDS,
        },
        $or: [{ isStreaming: true }, { onCall: true }],
      },
    },
    {
      $project: {
        rootUser: 1,
        isStreaming: 1,
        onCall: 1,
        profileImage: 1,
        rating: 1,
        bannedStates: 1,
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "rootUser",
        as: "rootUser",
      },
    },
    {
      $unwind: "$rootUser",
    },
    {
      $match: {
        "rootUser.needApproval": false,
      },
    },
    {
      $sort: { isStreaming: -1 },
    },
    {
      $project: {
        rootUser: 0,
      },
    },
  ])
    .then((liveModels) => {
      return res.status(200).json({
        actionStatus: "success",
        resultDocs: liveModels,
        page: 1,
        totalMatches: liveModels.length,
      })
    })
    .catch((err) => next(err))
}

exports.getAllModels = (req, res, next) => {
  Model.aggregate([
    {
      $sort: { onCall: -1, isStreaming: -1 },
    },
    {
      $match: {
        _id: {
          $nin: REJECTED_MODEL_IDS,
        },
      },
    },
    {
      $project: {
        rootUser: 1,
        name: 1,
        gender: 1,
        charges: 1,
        isStreaming: 1,
        onCall: 1,
        bannedStates: 1,
        profileImage: 1,
        rating: 1,
      },
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "rootUser",
        as: "rootUser",
      },
    },
    {
      $unwind: "$rootUser",
    },
    {
      $match: {
        "rootUser.needApproval": false,
      },
    },
    {
      $project: {
        rootUser: {
          password: 0,
          createdAt: 0,
          meta: 0,
          inProcessDetails: 0,
          needApproval: 0,
          permissions: 0,
          userType: 0,
        },
      },
    },
  ])
    .then((allModels) => {
      return res.status(200).json({
        actionStatus: "success",
        resultDocs: allModels,
        page: 1,
        totalMatches: allModels.length,
      })
    })
    .catch((err) => next(err))
}

exports.getModelsByRating = (req, res, next) => {
  const { lowerVal, upperVal, sort } = req.query

  const qry = {
    rating: { $gte: +lowerVal, $lte: upperVal },
  }

  paginator.withNormal(Model, qry, null, req, res).catch((err) => next(err))
}

exports.getModelByTags = (req, res, next) => {
  const query = {
    tags: { $all: req.query.split(",") },
  }

  paginator.withNormal(Model, query, null, req, res).catch((err) => next(err))
}

exports.getTagGroup = (req, res, next) => {
  // fetch all the tags in a tagGroup
  // ex all colors in colors - white, black

  const { id } = req.body

  TagGroup.findById(id)
    .populate("tags")
    .select("name tags.name modelCount")
    .then((doc) => {
      res.status(200).json({
        actionStatus: "success",
        doc: doc,
      })
    })
    .catch((err) => next(err))
}

exports.modelSearch = (req, res, next) => {
  const { term } = req.body
  const page = +req.body.page || 1
  const limit = +req.body.limit || 10

  Model.find(
    {
      $text: {
        $search: term,
      },
    },
    { score: { $meta: "textScore" } }
  )
    .skip((page - 1) * 1)
    .limit(limit)
    .sort({ score: { $meta: "textScore" } })
    .then((results) => {
      theResult = results
      return Model.find(
        {
          $text: {
            $search: term,
          },
        },
        { score: { $meta: "textScore" } }
      ).countDocuments()
    })
    .then((count) => {
      res.status(200).json({
        actionStatus: "success",
        results: theResults,
        pages: Math.ceil(count / limit),
        matches: count,
      })
    })
    .catch((err) => next(err))
}

exports.getLiveModelsCount = (req, res, next) => {
  try {
    return res.status(200).json({
      actionStatus: "success",
      liveNow: io.getLiveCount(),
    })
  } catch (err) {
    return res.status(500).json({
      actionStatus: "failed",
    })
  }
}
