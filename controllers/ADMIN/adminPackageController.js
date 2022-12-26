const Package = require("../../models/globals/package")

//create package
exports.createPackage = async (req, res, next) => {
  const requestBody = req.body

  try {
    const packageRecord = await Package.create({
      status: requestBody.status,
      coin: requestBody.coin,
      actualAmountINR: requestBody.actualAmount,
      discountedAmountINR: requestBody.discountedAmount,
      packageUrl: requestBody?.packageUrl || "",
      description: requestBody?.description || "",
    })
    return res.status(200).json({
      actionStatus: "success",
      data: packageRecord,
    })
  } catch (err) {
    next(err)
  }
}

//update package
exports.updatePackage = async (req, res, next) => {
  const packageId = req.params.id
  const requestBody = req.body
  try {
    await Package.updateOne(
      {
        _id: packageId,
      },
      {
        status: requestBody.status,
      }
    )
    return res.status(200).json({
      actionStatus: "success",
      message: "package update",
    })
  } catch (err) {
    next(err)
  }
}

//list package
exports.packageList = async (req, res, next) => {
  const requestBody = req.query
  console.log(requestBody)

  try {
    const packageRecord = await Package.find().lean()
    return res.status(200).json({
      actionStatus: "success",
      data: packageRecord,
    })
  } catch (err) {
    next(err)
  }
}

//get package by id
exports.getPackageById = async (req, res, next) => {
  const packageId = req.params?.id
  try {
    const packageRecord = await Package.findById(packageId).lean()
    return res.status(200).json({
      actionStatus: "success",
      data: packageRecord,
    })
  } catch (err) {
    next(err)
  }
}
