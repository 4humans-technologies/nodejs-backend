const order = require("../../models/globals/Order");

//list all active package for user
exports.getOrder = async (req, res, next) => {
  const reqQuery = req.query;
  console.log("order list api")
  let filter={};
  if(reqQuery?.status) filter.status=reqQuery.status;
  if(reqQuery?.country) filter.country=reqQuery.country;
  if(reqQuery?.packageAmountINR && !isNaN(reqQuery.packageAmountINR)) filter.packageAmountINR=Number(reqQuery.packageAmountINR);
  if(reqQuery?.packageId) filter.packageId=reqQuery.packageId;
  if(reqQuery?.userPaidAmount) filter.amount=reqQuery.userPaidAmount;
  console.log(filter,"filter")
  try {
    const orderRecord = await order.find(filter).lean();
   
    // console.log(reqQuery, await getExchangeRate(reqQuery.base))
    return res.status(200).json({
      actionStatus: "success",
      message: `success`, //TODO:
      data: orderRecord,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      actionStatus: "error",
      message: `issue in order list api`, //TODO:
    });
  }
};


//get order by id for user
exports.getOrderById = async (req, res, next) => {
    try {
      const orderRecord = await order.findOne({ _id: req.params.id}).lean();
     
      // console.log(reqQuery, await getExchangeRate(reqQuery.base))
      return res.status(200).json({
        actionStatus: "success",
        message: `success`, //TODO:
        data: orderRecord,
      });
    } catch (err) {
      console.log(err);
      return res.status(400).json({
        actionStatus: "error",
        message: `issue in order by id api`, //TODO:
      });
    }
  };
