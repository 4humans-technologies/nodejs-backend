exports.withAggregation = (Model, qry, req) => {
  const page = +req.query.page || 1
  const limit = +req.query.limit || 10
  const sort = req.query.sort || ""
  // will be good if you learn mongodb aggregation pipeline
  return Model.aggregate([
    {
      $facet: {
        paginatedResult: [
          { $match: qry },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ],
        totalCount: [{ $match: qry }, { $count: "totalCount" }],
      },
    },
  ]).then(
    ([
      {
        paginatedResult,
        totalCount: [{ totalCount }],
      },
    ]) => {
      return { paginatedResult, totalCount }
      // return res.status(200).json({
      //     actionStatus: "success",
      //     matches: result.totalCount,
      //     pages: Math.ceil(result.totalCount / limit),
      //     results: result.paginatedResult
      // })
    }
  )
}

exports.withNormal = (Model, qry, select, req, res, populate = null) => {
  const page = +req.query?.page || 1
  const limit = +req.query?.limit || 25
  const sort = req.query?.sort || null

  let theResults
  /**
   * if find query
   */
  if (Model) {
    return Model.find(qry)
      .select(select || null)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort)
      .populate(populate)
      .then((results) => {
        theResults = results
        return Model.find(qry).countDocuments()
      })
      .then((count) => {
        if (!res) {
          return {
            actionStatus: "success",
            totalMatches: count,
            pages: Math.ceil(count / limit),
            resultDocs: theResults,
          }
        }
        res.status(200).json({
          actionStatus: "success",
          totalMatches: count,
          pages: Math.ceil(count / limit),
          resultDocs: theResults,
        })
      })
  } else {
    /**
     * if not find query, some other query
     */
    return qry
      .select(select || null)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort(sort || "")
      .then((results) => {
        theResults = results
        return qry.countDocuments()
      })
      .then((count) => {
        if (!res) {
          return {
            actionStatus: "success",
            totalMatches: count,
            pages: Math.ceil(count / limit),
            resultDocs: theResults,
          }
        }
        return res.status(200).json({
          actionStatus: "success",
          totalMatches: count,
          pages: Math.ceil(count / limit),
          resultDocs: theResults,
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

exports.withConditionAndSendTheResponse = (model, options, req, res) => {
  return Promise.all([
    model
      .find(options.filter)
      .select(options.select)
      .populate(options.populate)
      .sort(options?.sort)
      .skip(options.skip)
      .limit(options.limit)
      .lean(),
    model.countDocuments(options.filter),
  ]).then(([records, totalCount]) => {
    res.setHeader(
      "Content-Range",
      `${options.skip}-${
        options.range[1] < totalCount ? options.range[1] - 1 : totalCount - 1
      }/${totalCount}`
    )
    return res.status(200).json(
      records.map((record) => ({
        id: record._id,
        ...record,
      }))
    )
  })
}
