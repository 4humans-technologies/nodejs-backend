const PriceRange = require("../../models/management/priceRanges")
const controllerErrorCollector = require("../../utils/controllerErrorCollector")

exports.createPriceRange = (req, res, next) => {
    controllerErrorCollector(req)

    const { name, description, minCharges, maxCharges } = req.body

    PriceRange({
        name,
        description,
        minCharges: +minCharges,
        maxCharges: +maxCharges,
        createdBy: req.user._id
    })
        .save()
        .then(pricerange => {
            res.status(200).json({
                actionStatus: "success",
                message: `"${name}" Price Range was created successfully`,
                doc: pricerange,
                docType: "pricerange"
            })
        })
        .catch(err => next(err))
}

exports.updatePriceRange = (req, res, next) => {
    controllerErrorCollector(req)

    const { rangeId, updatedObj } = req.body

    PriceRange.findOneAndUpdate({ _id: rangeId }, updatedObj, { new: true })
        .save()
        .then(pricerange => {
            res.status(200).json({
                message: "Price Range was updated successfully",
                doc: pricerange,
                docType: "pricerange",
                actionStatus: 'success'
            })
        })
        .catch(err => next(err))
}

exports.removePriceRange = (res, res, next) => {
    controllerErrorCollector(req)
    const { rangeIds } = req.body

    PriceRange.deleteMany({ _id: { $in: rangeIds } })
        .then(result => {
            res.status(200).json({
                actionStatus: "success",
                message: `${result.n} Price ranges were deleted successfully`,
                result
            })
        })
        .catch(err => next(err))
}