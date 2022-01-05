require("dotenv").config()
const mongoose = require("mongoose")
const User = require("./models/User")
const Model = require("./models/userTypes/Model")

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
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {},
          },
        ],
        foreignField: "_id",
        localField: "rootUser",
        as: "theUser",
      },
    },
    {
      $match: {
        "theUser.username": "model1",
      },
    },
    {
      $unwind: "$theUser",
    },
    // {
    //   $project: {
    //     custom_field: "$rootUser.username",
    //   },
    // },
  ]).then((results) => {
    results.forEach((model) => {
      console.log(model.theUser)
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

paginationByFacet()

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
