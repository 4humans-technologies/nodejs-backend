const Coupon = require("../../models/management/coupon");
// const Viewer = require("../../models/userTypes/Viewer")
const Wallet = require("../../models/globals/wallet");
const Order = require("../../models/globals/order");
const cryptoJS = require("crypto-js");
const package = require("../../models/globals/package");
let axios = require("axios");

/**
 * controller for deposit
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.deposit = async (req, res, next) => {
  const reqBody = req.body;
  try {
    const packageRecord = await package.findOne({
      _id: reqBody.packageId,
      status: "ACTIVE",
    });
    console.log(packageRecord);

    if (
      !packageRecord[reqBody.currency]?.discountedAmount &&
      packageRecord[reqBody.currency]?.discountedAmount != reqBody.amount && false
    ) {

      const message = !packageRecord[reqBody.currency]?.discountedAmount
        ? "packageId, no active package found"
        : "amount, amount of package is miss match";

      return res.status(400).json({
        actionStatus: "failed",
        message: `Please enter a valid ${message}`,
      });
    }

    const orderRecord = await Order.create({
      status: "CREATED",
      relatedUser: req.user.relatedUser._id,
      packageId: reqBody.packageId,
      amount: reqBody.amount,
      currency: reqBody.currency,
      country: reqBody.country,
      packageAmountINR: packageRecord?.INR?.discountedAmount
    });

    console.log(orderRecord, req.user);
    const axiosResponse = await createDepositOnAstropay(reqBody, orderRecord, req.user);
    const updateOrder = await Order.updateOne(
      {
        _id: orderRecord._id,
      },
      {
        status: axiosResponse?.data.status,
        paymentUrl: axiosResponse?.data?.url,
        deposit_external_id: axiosResponse?.data.deposit_external_id,
      }
    );
    console.log(updateOrder);

    return res.status(200).json({
      actionStatus: "success",
      message: `success`, //TODO:
      data: axiosResponse.data,
    });
  } catch (err) {
    console.log(err);
    const error = new Error("Payment Deposit issue");
    error.statusCode = 400;
    throw error;
  }
};

/**
 * controller for callback
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
exports.callback = async (req, res, next) => {
  let coin;
  let walletModified = false;
  try {
    let data = JSON.stringify(req.body);
    const signature = await getSignature(req.body);
    console.log(signature, req?.headers, "req?.headers?.Signature ");
    if (req?.headers?.signature != signature) {
      console.log(req.body, "callback api call");
      const error = new Error("Invalid request on the server");
      error.statusCode = 400;
      throw error;
    }
    let promiseArray = [];

    promiseArray.push(Order.findById(req.body.merchant_deposit_id).lean());
    promiseArray.push(astropayDepositAPICall(req.body.deposit_external_id));
    const [orderRecord, depositResponse] = await Promise.all(promiseArray);
    console.log(orderRecord, depositResponse);
    promiseArray = [];

    promiseArray.push(package.findById(orderRecord.packageId).lean());
    const [packageRecord] = await Promise.all(promiseArray);
    console.log("package Details:", packageRecord);
    coin = packageRecord.coin;
    const walletRecord = await Wallet.findOneAndUpdate(
      {
        relatedUser: orderRecord.relatedUser,
      },
      {
        $inc: { currentAmount: packageRecord.coin },
      },
      {
        new: true,
      }
    ).lean();
    walletModified = true;
    await Order.updateOne(
      {
        _id: req.body.merchant_deposit_id,
      },
      {
        status: depositResponse.status,
      }
    ).lean();
    console.log(
      `updated walled record for ${req.body.merchant_deposit_id}`,
      walletRecord
    );

    return res.status(204);
  } catch (err) {
    if (coin && walletModified) {
      const walletRecord = await Wallet.findOneAndUpdate(
        {
          relatedUser: orderRecord.relatedUser,
        },
        {
          $inc: { currentAmount: packageRecord.coin },
        },
        {
          new: true,
        }
      ).lean();
    }
    return res.status(400);
  }
};

/**
 * function to get signature
 * @param {Object} reqBody 
 * @returns {string} return signature
 */
async function getSignature(reqBody) {
  const secretKey = process.env.astropay_secret;
  const requestBody = JSON.stringify(reqBody); //Turn request body to a letiable
  let hash = cryptoJS.HmacSHA256(requestBody, secretKey).toString();
  return hash;
}
/**
 * Fucntion to get deposit status.
 * @param {String} depositExternalId 
 * @returns Obeject
 */
async function astropayDepositAPICall(depositExternalId) {
  var config = {
    method: "get",
    url: `${process.env.astropay_DEPOSIT_URL}/${depositExternalId}/status`,
    headers: {
      "Merchant-Gateway-Api-Key": process.env.astropay_apikey,
      "Content-Type": "application/json",
    },
  };
  console.log(config, "config");
  const axiosResponse = await axios(config);
  return axiosResponse.data;
}

async function createDepositOnAstropay(reqBody, orderRecord, reqUser) {
  const astropayReqBody = {
    amount: reqBody.amount,
    currency: reqBody.currency,
    country: reqBody.country,
    merchant_deposit_id: orderRecord._id,
    callback_url: `${process.env.astropay_callback_url}/callback`,
    user: {
      merchant_user_id: reqUser.relatedUser._id,
    },
    product: {
      mcc: process.env.ASTROPAY_MCC,
      category: process.env.ASTROPAY_CATEGORY,
      merchant_code: process.env.ASTROPAY_MERCHANT_CODE,
      description: "Test Deposit",
    },
    visual_info: {
      merchant_name: "tuktuklive",
    },
  };
  console.log(astropayReqBody);
  let data = JSON.stringify(astropayReqBody);
  // return ;
  const signature = await getSignature(astropayReqBody);
  console.log("\n=============\n", data, signature);
  const header = {
    "Merchant-Gateway-Api-Key": process.env.astropay_apikey,
    Signature: signature, //(astropayReqBody),
    "Content-Type": "application/json",
  };
  let config = {
    method: "post",
    url: process.env.astropay_DEPOSIT_URL + "/init",
    headers: header,
    data: astropayReqBody,
  };
  const axiosResponse = await axios(config);
  return axiosResponse;
}
