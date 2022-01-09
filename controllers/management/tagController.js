const Tag = require("../../models/management/tag")
const TagGroup = require("../../models/management/tagGroup")
const controllerErrorCollector = require("../../utils/controllerErrorCollector")
const { Types } = require("mongoose")
// this controller will control both "TAG" & "TAGGROUP"

exports.createTag = (req, res, next) => {
  controllerErrorCollector(
    req,
    "Improper data given, please input data in correct format and try again!"
  )

  const { name, description, tagGroupIds } = req.body

  Tag({
    name: name,
    description: description ? description : "No Description",
    tagGroups: tagGroupIds ? tagGroupIds : [],
  })
    .save()
    .then((tag) => {
      res.status(201).json({
        message: "tag created successfully",
        actionStatus: "success",
        tag: tag,
      })
    })
    .catch((err) => next(err))
}
exports.createTagGroup = (req, res, next) => {
  controllerErrorCollector(
    req,
    "Improper data given, please input data in correct format and try again!"
  )

  const { name, description, tagIds } = req.body

  TagGroup({
    name: name,
    description: description,
    tags: tagIds ? tagIds : [],
  })
    .save()
    .then((tagGroup) => {
      res.status(201).json({
        message: "tagGroup created successfully",
        actionStatus: "success",
        TagGroup: tagGroup,
      })
    })
    .catch((err) => next(err))
}
exports.updateTag = (req, res, next) => {
  controllerErrorCollector(
    req,
    "Improper data given, please input data in correct format and try again!"
  )

  const { id, name, description, tagGroupIds } = req.body

  // have to see is findOneAndUpdate runs validation before saving

  Tag.findOneAndUpdate(
    { _id: id },
    {
      name: name,
      description: description,
      tagGroups: tagGroupIds ? tagGroupIds : [],
    },
    { new: true }
  )
    .then((tag) => {
      res.status(200).json({
        message: "tag updated successfully",
        actionStatus: "success",
        Tag: tag,
      })
    })
    .catch((err) => next(err))
}
exports.updateTagGroup = (req, res, next) => {
  controllerErrorCollector(
    req,
    "Improper data given, please input data in correct format and try again!"
  )

  const { id, name, description, tagIds } = req.body

  TagGroup.findOneAndUpdate(
    { _id: id },
    {
      name: name,
      description: description,
      tags: tagIds ? tagIds : [],
    },
    { new: true }
  )
    .then((tagGroup) => {
      res.status(200).json({
        message: "tagGroup updated successfully",
        actionStatus: "success",
        TagGroup: tagGroup,
      })
    })
    .catch((err) => next(err))
}
exports.removeTag = (req, res, next) => {
  controllerErrorCollector(
    req,
    "Improper data given, please input data in correct format and try again!"
  )

  const { id } = req.params

  Tag.findByIdAndRemove(id)
    .then((doc) => {
      res.status(204).json({
        message: "tag deleted successfully",
        actionStatus: "success",
      })
    })
    .catch((err) => next(err))
}
exports.removeTagGroup = (req, res, next) => {
  controllerErrorCollector(
    req,
    "Improper data given, please input data in correct format and try again!"
  )

  const { id } = req.params

  TagGroup.findByIdAndRemove(id)
    .then((doc) => {
      res.status(204).json({
        message: "tagGroup deleted successfully",
        actionStatus: "success",
      })
    })
    .catch((err) => next(err))
}
exports.getTag = (req, res, next) => {
  controllerErrorCollector(
    req,
    "Improper data given, please input data in correct format and try again!"
  )

  const { id } = req.params

  Tag.findById(id)
    .then((tag) => {
      res.status(200).json({
        message: "tag fetched successfully",
        actionStatus: "success",
        doc: tag,
      })
    })
    .catch((err) => next(err))
}
exports.getTags = (req, res, next) => {
  const page = +req.query.page || 1
  const limit = +req.query.limit || 10

  Tag.find({ createdAt: { $lte: new Date() } })
    .skip((page - 1) * limit)
    .limit(limit)
    .sort("-createdAt")
    .then((tags) => {
      return Tag.count().then((count) => {
        if (tags !== null && tags.length !== 0) {
          res.status(200).json({
            message: "Fetched tags successfully",
            docs: tags,
            count: count,
            pages: Math.ceil(count / limit),
          })
        } else {
          const error = new Error(
            "Exceeded limit, this much tags does not exist"
          )
          error.statusCode = 400
          throw error
        }
      })
    })
    .catch((err) => {
      return next(err)
    })
}
exports.getTagGroup = (req, res, next) => {
  controllerErrorCollector(
    req,
    "Improper data given, please input data in correct format and try again!"
  )

  const { id } = req.params

  TagGroup.findById(id)
    .then((tagGroup) => {
      res.status(200).json({
        message: "tagGroup fetched successfully",
        actionStatus: "success",
        doc: tagGroup,
      })
    })
    .catch((err) => next(err))
}
exports.getTagGroups = (req, res, next) => {
  const page = +req.query.page || 1
  const limit = +req.query.limit || 10

  TagGroup.find({ createdAt: { $lte: new Date() } })
    .skip((page - 1) * limit)
    .limit(limit)
    .sort("-createdAt")
    .then((tagGroups) => {
      return TagGroup.count().then((count) => {
        if (tagGroups !== null && tagGroups.length !== 0) {
          res.status(200).json({
            message: "Fetched tags successfully",
            docs: tagGroups,
            count: count,
            pages: Math.ceil(count / limit),
          })
        } else {
          const error = new Error(
            "Exceeded limit, this much tagGroups does not exist"
          )
          error.statusCode = 400
          throw error
        }
      })
    })
    .catch((err) => {
      return next(err)
    })
}
