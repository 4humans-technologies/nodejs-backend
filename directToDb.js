require("dotenv").config()
const mongoose = require("mongoose")
const User = require("./models/User")
const Model = require("./models/userTypes/Model")
const Viewer = require("./models/userTypes/Viewer")
const Staff = require("./models/userTypes/Staff")
const Coupon = require("./models/management/coupon")
const CoinsSpendHistory = require("./models/globals/coinsSpendHistory")
const ObjectId = require("mongodb").ObjectId
const Wallet = require("./models/globals/wallet")
const AudioCall = require("./models/globals/audioCall")
const VideoCall = require("./models/globals/videoCall")
const Stream = require("./models/globals/Stream")
const Permission = require("./models/Permission")
const Log = require("./models/log/log")
const generateJwt = require("./utils/generateJwt")
const bcrypt = require("bcrypt")

if (process.env.LOCAL_DB === "false") {
  var CONNECT_URL = `mongodb+srv://${process.env.DO_MONGO_USER}:${process.env.DO_MONGO_PASS}@dreamgirl-mongodb-3node-blr-1-c5185824.mongo.ondigitalocean.com/${process.env.DO_MONGO_DIRECT_TEST_DB_NAME}?authSource=${process.env.DO_MONGO_AUTH_SOURCE}&replicaSet=${process.env.DO_MONGO_REPLICA_SET}&ssl=true`
  // CONNECT_URL = `mongodb+srv://${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_USER}:${process.env.NODE_TODO_MONGO_ATLAS_ROHIT_PASS}@nodejs.fsqgg.mongodb.net/${process.env.DB_NAME}?w=majority`
} else {
  // CONNECT_URL = `mongodb://192.168.1.104:27017/${process.env.DB_NAME}`;
  var CONNECT_URL = `mongodb://localhost:27017/${process.env.DB_NAME}`
}

mongoose
  .connect(CONNECT_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
    tls: true,
    tlsCAFile: "./ca-certificate.crt",
    readConcern: "local",
    readPreference: process.env.DO_READ_PREFERENCE,
  })
  .then(() => {
    console.log("============== CONNECTED TO MongoDB =============")
  })

function findAllUsers() {
  User.find()
    .select("username -_id")
    .then((users) => {
      console.log(users)
      return User.find().countDocuments()
    })
    .then((count) => {
      console.log("Count : ", count)
    })
}

// findAllUsers()
function modelOps() {
  Model.aggregate([
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "rootUser",
        as: "rootUser",
      },
    },
    // {
    //   $match: {
    //     "theUser.username": "model1",
    //   },
    // },
    {
      $unwind: "$rootUser",
    },
    {
      $project: {
        custom_field: "$rootUser.username",
      },
    },
  ]).then((results) => {
    results.forEach((model) => {
      console.log(model)
    })
  })
}

function paginationByFacet() {
  Model.aggregate([
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "rootUser",
        as: "rootUser",
      },
    },
    {
      $lookup: {
        from: "wallets",
        foreignField: "_id",
        localField: "wallet",
        as: "wallet",
      },
    },
    {
      $unwind: "$wallet",
    },
    {
      $unwind: "$rootUser",
    },
    {
      $project: {
        userWallet: "$wallet.currentAmount",
        username: "$rootUser.username",
      },
    },
    {
      $facet: {
        paginationResult: [
          {
            $match: {},
          },
        ],
      },
    },
  ]).then((results) => {
    results.forEach((result) => {
      console.log(result)
    })
  })
}

function constructModel(query) {
  Model.aggregate([
    {
      $match: query,
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "rootUser",
        as: "rootUser",
      },
    },
    {
      $lookup: {
        from: "wallets",
        foreignField: "_id",
        localField: "wallet",
        as: "wallet",
      },
    },
    {
      $unwind: "$wallet",
    },
    {
      $unwind: "$rootUser",
    },
  ])
}

function createStaff() {
  const entryData = {
    username: "staff_one",
    password: "testing123",
    name: "staff_one",
    email: "staff1@gmail.com",
    phone: "9123568945",
  }
  const { username, password, name, email, phone } = entryData

  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()

  bcrypt
    .genSalt(5)
    .then((salt) => {
      return Promise.all([
        bcrypt.hash(password, salt),
        Permission.find().lean().select("value"),
      ])
    })
    .then(([hashedPassword, permissions]) => {
      return Promise.all([
        Staff({
          _id: advRelatedUserId,
          rootUser: advRootUserId,
          name: name,
          email: email,
          phone: String(phone),
          remark:
            "This staff was created from 'directToDb', not meant for production use!",
          profileImage:
            "https://dreamgirl-public-bucket.s3.ap-south-1.amazonaws.com/admin-iamge.png",
        }).save(),
        User({
          _id: advRootUserId,
          username: username,
          password: hashedPassword,
          permissions: permissions.map((permission) => permission.value),
          userType: "Staff",
          needApproval: true,
          relatedUser: advRelatedUserId,
          meta: {
            lastLogin: new Date(),
          },
        }).save(),
      ])
    })
    .then(([staff, rootUser]) => {
      const user = {
        ...rootUser._doc,
        relatedUser: {
          ...staff._doc,
        },
      }

      console.log(user)
    })
    .catch((err) => {
      return Promise.allSettled([
        Staff.deleteOne({ _id: advRelatedUserId }),
        User.deleteOne({ _id: advRootUserId }),
      ])
        .then(() => {
          const error = new Error(err.message + " staff not registered")
          error.statusCode = err.statusCode || 500
          throw error
        })
        .catch((finalError) => console.error(finalError))
    })
    .catch((finalError) => console.error(finalError))
}

function couponOps() {
  return Coupon.aggregate([
    {
      $match: {},
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "generatedBy",
        as: "generatedBy",
      },
    },
    {
      $unwind: "$generatedBy",
    },
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "redeemedBy",
        as: "redeemedBy",
      },
    },
    {
      $unwind: {
        path: "$redeemedBy",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        code: 1,
        forCoins: 1,
        redeemed: 1,
        redeemDate: 1,
        "generatedBy.username": 1,
        "redeemedBy.username": 1,
      },
    },
  ])
    .then((coupon) => {
      console.log(coupon)
    })
    .catch((err) => console.error(err))
}

function coinOps() {
  // CoinsSpendHistory.aggregate([
  //   {
  //     $lookup: {
  //       from: "models",
  //       let: { id: "$forModel" },
  //       pipeline: [
  //         { $match: { $expr: { $eq: ["$_id", "$$id"] } } },
  //         {
  //           $lookup: {
  //             from: "users",
  //             let: { rootUserId: "$rootUser" },
  //             pipeline: [
  //               {
  //                 $match: { $expr: { $eq: ["$_id", "$$rootUserId"] } },
  //               },
  //               { $project: { username: 1, _id: 0 } },
  //             ],
  //             as: "forModel.rootUser",
  //           },
  //         },
  //         {
  //           $project: { profileImage: 1, name: 1, _id: 0, rootUser: 1 },
  //         },
  //         {
  //           $unwind: {
  //             path: "$forModel.rootUser",
  //             preserveNullAndEmptyArrays: true,
  //           },
  //         },
  //       ],
  //       as: "forModel",
  //     },
  //   },
  //   {
  //     $unwind: "$forModel",
  //   },
  // ])
  CoinsSpendHistory.aggregate([
    {
      $lookup: {
        from: "models",
        localField: "forModel",
        foreignField: "_id",
        as: "forModel",
      },
    },
    {
      $unwind: "$forModel",
    },
    {
      $lookup: {
        from: "users",
        localField: "forModel.rootUser",
        foreignField: "_id",
        as: "forModel.rootUser",
      },
    },
    {
      $unwind: "$forModel.rootUser",
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        forModel: {
          profileImage: 1,
          name: 1,
          rootUser: {
            username: 1,
          },
        },
        time: 1,
        sharePercent: 1,
        tokenAmount: 1,
        by: 1,
        givenFor: 1,
      },
    },
  ])
    .then((record) => {
      console.log(record)
    })
    .catch((err) => console.log(err))
}

function testOps() {
  Model.aggregate([
    {
      $project: {
        callActivity: 0,
        tipMenuActions: 0,
        charges: 0,
        pendingCalls: 0,
        bankDetails: 0,
        followers: 0,
        languages: 0,
        bio: 0,
        tags: 0,
        publicImages: 0,
        publicVideos: 0,
        privateImages: 0,
        privateVideos: 0,
        streams: 0,
        videoCallHistory: 0,
        audioCallHistory: 0,
        approval: 0,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "rootUser",
        foreignField: "_id",
        as: "rootUser",
      },
    },
    {
      $unwind: "$rootUser",
    },
    {
      $lookup: {
        from: "wallets",
        localField: "wallet",
        foreignField: "_id",
        as: "wallet",
      },
    },
    {
      $unwind: "$wallet",
    },
    {
      $project: {
        profileImage: 1,
        rootUser: {
          username: 1,
          "meta.lastLogin": 1,
        },
        wallet: {
          currentAmount: 1,
        },
        name: 1,
        numberOfFollowers: 1,
        sharePercent: 1,
        rating: 1,
        isStreaming: 1,
        onCall: 1,
        adminRemark: 1,
      },
    },
    {
      $sort: { "wallet.currentAmount": -1 },
    },
    {
      $skip: 0,
    },
    {
      $limit: 6,
    },
  ])
    .then((records) => {
      console.log(records)
    })
    .catch((err) => console.error(err))
}

function couponAggregation() {
  const todayElapsed =
    new Date().getHours() * 3600 * 1000 +
    new Date().getMinutes() * 60 * 1000 +
    new Date().getSeconds() * 1000

  const todaysZeroHour = new Date(Date.now() - todayElapsed)

  const constructCouponPipeline = (dateQueryValue) => {
    return [
      {
        $match: {
          redeemed: true,
          //   createdAt: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
          redeemDate: { $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
        },
      },
      {
        $facet: {
          monthlyEarning: [
            {
              $group: {
                _id: null,
                sum: { $sum: "$forCoins" },
              },
            },
          ],
          monthlyCount: [
            {
              $count: "monthlyCount",
            },
          ],
          weeklyEarning: [
            {
              $match: {
                redeemDate: {
                  $gte: new Date(Date.now() - 7 * 24 * 3600 * 1000),
                },
              },
            },
            {
              $group: {
                _id: null,
                sum: { $sum: "$forCoins" },
              },
            },
          ],
          todayEarning: [
            {
              $match: {
                redeemDate: {
                  $gte: todaysZeroHour,
                },
              },
            },
            {
              $group: {
                _id: null,
                sum: { $sum: "$forCoins" },
              },
            },
          ],
        },
      },
    ]
  }

  // last 20 logs
  //   streams today
  //   audioCalls today
  //   videoCalls today
  //   viewers joined today
  //   total models

  Promise.all([
    // Log.find().sort("-_id").limit(20).lean(),
    Stream.find({ createdAt: { $gte: todaysZeroHour } }).countDocuments(),
    AudioCall.find({ createdAt: { $gte: todaysZeroHour } }).countDocuments(),
    VideoCall.find({ createdAt: { $gte: todaysZeroHour } }).countDocuments(),
    // User.find({
    //   userType: "Viewer",
    //   createdAt: { $gte: todaysZeroHour },
    // })
    //   .select("-_id username")
    //   .sort("-_id")
    //   .limit(10)
    //   .lean(),
    Model.find({
      $or: [{ isStreaming: true }, { onCall: true }],
    }).countDocuments(),
    // User.find({
    //   userType: "Model",
    //   needApproval: true,
    // }).lean(),
    Model.find().countDocuments(),
    Viewer.find().countDocuments(),
    Coupon.aggregate(
      constructCouponPipeline(new Date(Date.now() - 24 * 3600 * 1000))
    ),
  ])
    .then((result) => {
      console.log("sum : ", result)
      console.log("coupon aggregation : ", result[result.length - 1][0])
    })
    .catch((err) => console.error(err))
}

// paginationByFacet()
// createStaff()
// modelOps()
// couponOps()
// coinOps()
// testOps()
couponAggregation()
