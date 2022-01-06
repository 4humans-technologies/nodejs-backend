require("dotenv").config()
const mongoose = require("mongoose")
const User = require("./models/User")
const Model = require("./models/userTypes/Model")
const Wallet = require("./models/globals/wallet")

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

const createModels = (req, res, next) => {
  errorCollector(req, "Invalid form details, please try again")
  const { username, password, name, email, phone, gender, age, profileImage } =
    req.body

  const { socketId } = req.query

  let theWallet, theModel, theUserId
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()
  const approvalId = new ObjectId()
  let wasSocketUpdated = false

  Wallet({
    userType: "Model",
    currentAmount: 0,
    rootUser: advRootUserId,
    relatedUser: advRelatedUserId,
  })
    .save()
    .then((wallet) => {
      theWallet = wallet
      return Model({
        _id: advRelatedUserId,
        rootUser: advRootUserId,
        approval: approvalId,
        name: name,
        gender: capitalizeFirstLetter(gender),
        email: email,
        phone: phone,
        dob: new Date().getFullYear() - age,
        wallet: wallet._id,
        // profileImage: "/" + req.file.path.replace(/\\/g, "/"),
        profileImage: profileImage,
        languages: ["Hindi"],
      }).save()
    })
    .then((model) => {
      theModel = model
      const salt = bcrypt.genSaltSync(5)
      const hashedPassword = bcrypt.hashSync(password, salt)
      return User({
        _id: advRootUserId,
        username: username,
        password: hashedPassword,
        permissions: [],
        userType: "Model",
        relatedUser: advRelatedUserId,
        needApproval: false, //🔴🔴 set to false only for testing
        meta: {
          lastLogin: new Date(),
        },
        inProcessDetails: {
          emailVerified: false,
        },
      }).save()
    })
    .then((userDoc) => {
      theUserId = userDoc._id
      const hours = 1
      const token = generateJwt({
        hours: hours,
        userId: theUserId,
        relatedUserId: userDoc.relatedUser._id,
        userType: userDoc.userType,
        role: userDoc?.role?.roleName || "no-role",
      })

      /* hello moto  */
      let wasEmailSent = false
      const emailToken = generateEmailConformationJWT({
        userId: theUserId,
        relatedUserId: userDoc.relatedUser._id,
        userType: userDoc.userType,
      })

      /**
       * my view is may be for some reason socketId may not be sent but,
       * because of that right user should not be devoid of registration or login
       * anyway i'am sending "wasSocketUpdated" so that if on server socket
       * was not updated we can handover this task to the client
       * their we can emit to update user info very easily
       */
      try {
        const clientSocket = io.getIO().sockets.sockets.get(socketId)
        /* remove all previous listeners */
        clientSocket.removeAllListeners(
          chatEventListeners.unAuthedViewerEventList
        )

        /* add to the private room */
        clientSocket.join(`${userDoc.relatedUser._id}-private`)

        /* add socket listeners for the specific userType */
        chatEventListeners.modelListeners(clientSocket)

        /* update client info */
        clientSocket.data = {
          ...clientSocket.data,
          userId: userDoc._id.toString(),
          relatedUserId: userDoc.relatedUser._id.toString(),
        }
        clientSocket.authed = true
        clientSocket.userType = userDoc.userType
        wasSocketUpdated = true
      } catch (error) {
        wasSocketUpdated = false
      }

      /* send conformation email */
      try {
        sendModelEmailConformation({
          to: email,
          dynamic_template_data: {
            confirm_url: `${
              process.env.FRONTEND_URL.includes("localhost") ? "http" : "https"
            }://${
              process.env.FRONTEND_URL
            }/link-verification/email?token=${emailToken}`,
            first_name: name.split(" ")[0],
            confirm_before:
              +process.env.EMAIL_CONFORMATION_EXPIRY_HOURS_MODEL / 24,
          },
        })
        wasEmailSent = true
      } catch (error) {
        wasEmailSent = false
      }

      return res.status(201).json({
        message: "model registered successfully",
        actionStatus: "success",
        user: userDoc,
        model: theModel,
        // TODO: remove wallet in production, no need of wallet 🔺🔻🔻🔺
        wallet: theWallet,
        token: token,
        expiresIn: hours,
        wasSocketUpdated: wasSocketUpdated,
        wasEmailSent: wasEmailSent,
      })
    })
    .catch((err) => {
      Promise.allSettled([
        Wallet.deleteOne({
          _id: theWallet._id,
        }),
        Model.deleteOne({
          _id: advRelatedUserId,
        }),
        User.deleteOne({
          _id: advRootUserId,
        }),
      ])
        .then((results) => {
          if (err?.name === "MongoError") {
            switch (err.code) {
              case 11000: {
                const field = Object.keys(err.keyValue)[0]
                const fieldValue = err.keyValue[field]
                const errMessage = `${field} "${fieldValue}", is already used.`
                const error = new Error(errMessage)
                error.statusCode = 400
                throw error
              }
              default: {
                const error_default = new Error(
                  err.message || "viewer not registered"
                )
                error_default.statusCode = err.statusCode || 500
                throw error_default
              }
            }
          } else {
            const error = new Error(err.message || "Model was not registered")
            error.statusCode = err.statusCode || 400
            error.data = {
              code: err.code,
            }
            throw error
          }
        })
        .catch((finalError) => next(finalError))
    })
}
