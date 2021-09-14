const Gift = require("../../models/globals/Gift")
const paginator = require("../../utils/paginator")


exports.createGift = (req, res, next) => {
    controllerErrorCollector(req)
    const { name, price } = req.body
    Gift({
        name,
        price: +price
    })
        .save()
        .then(gift => {
            res.status(200).json({
                actionStatus: "success",
                message: "gift created successfully",
            })
        })
        .catch(err => next(err))
}

exports.getGift = (req, res, next) => {
    Gift.findById(req.giftId)
        .then(gift => {
            if (!gift) {
                // ERROR
            }
            res.status(200).json({
                doc: gift,
                docType: "gift",
                actionStatus: "success"
            })
        })
        .catch(err => next(err))
}

exports.getGifts = (req, res, next) => {
    controllerErrorCollector(req)
    const qry = {}
    paginator.withNormal(Gift, qry, select, req, res)
        .catch(err => next(err))
}

exports.updateGift = (req, res, next) => {
    const { giftId, updatedObj } = req.body

    Gift.findOneAndUpdate({ _id: giftId }, updatedObj, { new: true })
        .save()
        .then(gift => {
            res.status(200).json({
                actionStatus: "success",
                doc: gift,
                docType: "gift"
            })
        })
        .catch(err => next(err))
}
exports.removeGift = (req, res, next) => {
    const { giftIds } = req.body
    Gift.deleteMany({ _id: { $in: giftIds } })
        .then(result => {
            res.status(200).json({
                actionStatus: "success",
                message: `${result.n} Gifts were deleted successfully`,
                result: result
            })
        })

}


exports.filterGifts = (req, res, next) => {



}