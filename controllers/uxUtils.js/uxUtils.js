// all small api's for composing the fronted plus
// the end point to get all the data to compose the dashboard

const Tag = require("../../models/management/tag")
const TagGroup = require("../../models/management/tagGroup")
const Model = require("../../models/userTypes/Model")
const paginator = require("../../utils/paginator")

exports.getStreamingModels = (req, res, next) => {
    const qry = {
        isStreaming: true
    }
    paginator.withNormal(Model, qry, null, req, res)
        .catch(err => next(err))
}

exports.getModelsByRating = (req, res, next) => {
    const { lowerVal, upperVal, sort } = req.query

    const qry = {
        "rating": { $gte: +lowerVal, $lte: upperVal }
    }

    paginator.withNormal(Model, qry, null, req, res)
        .catch(err => next(err))
}

exports.getModelByTags = (req, res, next) => {
    const query = {
        "tags": { $all: req.query.split(",") }
    }

    paginator.withNormal(Model, query, null, req, res)
        .catch(err => next(err))
}

exports.getTagGroup = (req, res, next) => {
    // fetch all the tags in a tagGroup
    // ex all colors in colors - white, black

    const { id } = req.body

    TagGroup.findById(id)
        .populate("tags")
        .select("name tags.name modelCount")
        .then(doc => {
            res.status(200).json({
                actionStatus: "success",
                doc: doc
            })
        }).catch(err => next(err))
}

exports.modelSearch = (req, res, next) => {
    const { term } = req.body
    const page = +req.body.page || 1
    const limit = +req.body.limit || 10

    Model.find({
        $text: {
            $search: term
        }
    }, { score: { $meta: "textScore" } })
        .skip((page - 1) * 1)
        .limit(limit)
        .sort({ score: { $meta: "textScore" } })
        .then(results => {
            theResult = results
            return Model.find({
                $text: {
                    $search: term
                }
            }, { score: { $meta: "textScore" } })
                .countDocuments()
        })
        .then(count => {
            res.status(200).json({
                actionStatus: "success",
                results: theResults,
                pages: Math.ceil(count / limit),
                matches: count
            })
        })
        .catch(err => next(err))
}