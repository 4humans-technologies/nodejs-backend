require("dotenv").config()
const mongoose = require("mongoose")
const User = require("./models/User")
const Model = require("./models/userTypes/Model")
const Staff = require("./models/userTypes/Staff")
const ObjectId = require("mongodb").ObjectId
const Wallet = require("./models/globals/wallet")
const Permission = require("./models/Permission")
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

// paginationByFacet()
// createStaff()
modelOps()
