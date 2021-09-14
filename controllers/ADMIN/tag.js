const Tag = require("../../models/management/tag")
const Model = require("../../models/userTypes/Model")
const paginator = require("../../utils/paginator")
const controllerErrorCollector = require("../../utils/controllerErrorCollector")


exports.createTag = (req, res, next) => {
    controllerErrorCollector(req)

    const { name, description } = req.body

    Tag({
        name,
        description,
        modelCount: 0,
    })
        .save()
        .then(tag => {
            res.status(200).json({
                actionStatus: "success",
                message: "tag created successfully"
            })
        })
        .catch(err => next(err))
}

exports.getTag = (req, res, next) => {

    controllerErrorCollector(req)
    const { tagId } = req.body

    Tag.findById(tagId)
        .then(tag => {
            if (!tag) {
                // ERROR 🔴
            }
            res.status(200).json({
                actionStatus: "success",
                docType: "tag",
                doc: tag
            })
        })
        .catch(err => next(err))
}

exports.getTags = (res, res, next) => {
    controllerErrorCollector(req)

    const qry = {}
    paginator.withNormal(Tag, qry, select, req, res)
        .catch(err => next(err))
}

exports.updateTag = (req, res, next) => {
    controllerErrorCollector(req)

    // do you need to update in other models
    // also ??? 🔴

    const { tagId, name, description } = req.body

    Tag.findOneAndUpdate({ _id: tagId }, { name: name, description })
        .then(tag => {
            res.status(200).json({
                actionStatus: "success",
                doc: tag
            })
        })
        .catch(err => next(err))
}

exports.removeTags = (res, res, next) => {
    const { tagIds } = req.body
    // do you need to update in other models
    // also ??? 🔴
    Tag.deleteMany({ _id: { $in: tagIds } })
        .then(result => {
            res.status(200).json({
                actionStatus: "success",
                message: `${result.n} tag(s) were deleted successfully`,
                result: result
            })
        }).catch(err => next(err))
}