exports.withAggregation = (Model, qry, req) => {
    const page = +req.query.page || 1
    const limit = +req.query.limit || 10
    const sort = req.query.sort || ""
    // will be good if you learn mongodb aggregation pipeline
    return Model.aggregate([{
        $facet: {
            paginatedResult: [
                { $match: qry },
                { $skip: (page - 1) * limit },
                { $limit: limit },
            ],
            totalCount: [
                { $match: qry },
                { $count: 'totalCount' }
            ]
        }
    }])
        .then(([{ paginatedResult, totalCount: [{ totalCount }] }]) => {
            return { paginatedResult, totalCount }
            // return res.status(200).json({
            //     actionStatus: "success",
            //     matches: result.totalCount,
            //     pages: Math.ceil(result.totalCount / limit),
            //     results: result.paginatedResult
            // })
        })
}

exports.withNormal = (Model, qry, select, req, res) => {
    const page = +req.query.page || 1
    const limit = +req.query.limit || 10
    const sort = req.query.sort

    let theResults;
    if (Model) {
        return Model.find(qry)
            .select(select || null)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort(sort || "")
            .then(results => {
                theResults = results
                return Model.find(qry)
                    .countDocuments()
            })
            .then(count => {
                if (!res) {
                    return {
                        actionStatus: "success",
                        totalMatches: count,
                        pages: Math.ceil(count / limit),
                        resultDocs: theResults
                    }
                }
                res.status(200).json({
                    actionStatus: "success",
                    totalMatches: count,
                    pages: Math.ceil(count / limit),
                    resultDocs: theResults
                })
            })
    } else {
        return qry
            .select(select || null)
            .skip((page - 1) * limit)
            .limit(limit)
            .sort(sort || "")
            .exec()
            .then(results => {
                theResults = results
                return qry
                    .countDocuments()
            })
            .then(count => {
                if (!res) {
                    return {
                        actionStatus: "success",
                        totalMatches: count,
                        pages: Math.ceil(count / limit),
                        resultDocs: theResults
                    }
                }
                res.status(200).json({
                    actionStatus: "success",
                    totalMatches: count,
                    pages: Math.ceil(count / limit),
                    resultDocs: theResults
                })
            })
    }
}

// const [{ paginatedResult, totalCount }] = Sale.aggregate([{
//     $facet: {
//         paginatedResult: [
//             { $match: query },
//             { $skip: skip },
//             { $limit: limit }
//         ],
//         totalCount: [
//             { $match: query },
//             { $count: 'totalCount' }
//         ]
//     }
// }])