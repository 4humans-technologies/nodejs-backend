const order = require("../../models/globals/order");

//list all active package for user
exports.getOrder = async (req, res, next) => {
  const reqQuery = req.query;
  try {
    const orderRecord = await order.find({ relatedUser:req.user.relatedUser._id }).lean();
   
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
      const orderRecord = await order.findOne({ _id: req.params.id, relatedUser:req.user.relatedUser._id}).lean();
     
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
