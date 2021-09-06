const Sale = require("../../models/test/saleSchema");
const paginator = require("../../utils/paginator")

exports.forExp = (req, res, next) => {
    // const page = +req.query.page || 1
    // const limit = +req.query.limit || 10
    // const sort = req.query.sort || ""
    // let theSales

    // Sale.find({})
    //     .where("items.price").gte(1000)
    //     .select("customer.age items.price")
    //     .skip((page - 1) * limit)
    //     .sort(sort)
    //     // .sort("items.price")
    //     .limit(limit)
    //     .then(sales => {
    //         theSales = sales
    //         Sale.find({})
    //             .where("items.price").gte(1000)
    //             .countDocuments()
    //             .then(count => {
    //                 res.status(200).json({
    //                     len: theSales.length,
    //                     pages: Math.ceil(count / limit),
    //                     matches: count,
    //                     docs: theSales,
    //                 })
    //             })
    //     }).catch(err => next(err))

    // Sale.find({ "items.tags": { $all: ["electronics", "school"] } })
    // Sale.find({ $and: [{ "items.tags": { $all: ["electronics", "school"] } }, { "items.tags.3": { "$exists": false } }] })
    //     // .where("items.tags").in(["office", "school"])
    //     // .select("items.tags")
    //     .skip((page - 1) * limit)
    //     .sort(sort)
    //     // .sort("items.price")
    //     .limit(limit)
    //     .then(sales => {
    //         theSales = sales
    //         Sale.find({ $and: [{ "items.tags": { $all: ["electronics", "school"] } }, { "items.tags.3": { "$exists": false } }] })
    //             // .where("items.price").gte(1000)
    //             .countDocuments()
    //             // .select("items.tags")
    //             .then(count => {
    //                 res.status(200).json({
    //                     len: theSales.length,
    //                     pages: Math.ceil(count / limit),
    //                     matches: count,
    //                     docs: theSales,
    //                 })
    //             }).catch(err => next(err))
    //     }).catch(err => next(err))
}

exports.paginationByAggregation = (req, res, next) => {

    const qry = {
        $and: [
            {
                "items.tags": {
                    $all: ["electronics", "school"]
                }
            },
            {
                "items.tags.3": {
                    "$exists": false
                }
            }
        ]
    }
    paginator.withNormal(Sale, qry, "saleDate customer.name items.name items.price", req, res)
        .catch(err => next(err))
}