const package = require("../../models/globals/package");
const fetch = require('node-fetch');

//list all active package for user
exports.getPackage = async (req, res, next) => {
  const reqQuery = req.query;
  try {
    const packageRecord = await package.find({ "status": "ACTIVE" }).lean();
    console.log(packageRecord);
    const baseCurrency = (reqQuery.base + "").toUpperCase();
    const exchangeRate = await getExchangeRate("INR",baseCurrency);
    console.log(exchangeRate,baseCurrency );
    for (let i = 0; i < packageRecord.length; i++) {
      packageRecord[i].discountedAmount = Number((packageRecord[i].discountedAmountINR * exchangeRate).toFixed(2));
      packageRecord[i].actualAmount = Number((packageRecord[i].actualAmountINR * exchangeRate).toFixed(2));
    }
    // console.log(reqQuery, await getExchangeRate(reqQuery.base))
    return res.status(200).json({
      actionStatus: "success",
      message: `success`, //TODO:
      data: packageRecord,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({
      actionStatus: "error",
      message: `issue in package list api`, //TODO:
    });
  }
};


/**
 * 
 * @param {String} base 
 * @returns 
 */
async function getExchangeRate(base) {

  const response = await (await fetch(process.env.EXCHANGE_RATE_URL + base)).json();
  return response.rates[baseCurrency];
}