const package = require("../../models/globals/package");
exports.getPackage = async (req, res, next) => {
  const reqBody = req.body;
  try {
    const packageRecord = await package.find().lean();
    console.log(packageRecord);
    return res.status(200).json({
      actionStatus: "success",
      message: `success`, //TODO:
      data: packageRecord,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Issue in Package list");
    error.statusCode = 400;
    throw error;
  }
};
