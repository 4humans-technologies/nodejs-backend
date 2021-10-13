const Model = require("../../models/userTypes/Model")
const User = require("../../models/User")
const Role = require("../../models/Role")
const Wallet = require("../../models/globals/wallet")
const errorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")
const ObjectId = require("mongodb").ObjectId

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

exports.createModel = (req, res, next) => {
  errorCollector(req, "Invalid form details, please try again")
  const { username, password, name, email, phone, gender, age, languages } =
    req.body

  let theWallet, theModel, theUserId
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()
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
        name: name,
        gender: capitalizeFirstLetter(gender),
        email: email,
        phone: phone,
        dob: new Date().getFullYear() - age,
        wallet: wallet._id,
        profileImage: "/" + req.file.path.replace(/\\/g, "/"),
        languages: languages.split(",") || ["hindi"],
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
          lastLogin: new Date().toISOString(),
        },
      }).save()
    })
    .then((userDoc) => {
      theUserId = userDoc._id
      res.status(201).json({
        message: "model registered successfully",
        actionStatus: "success",
        user: userDoc,
        model: theModel,
        // TODO: remove wallet in production, no need of wallet
        wallet: theWallet,
      })
      /* 👇👇 this below code is not working */
      // theWallet.rootUser = userDoc._id;
      // theWallet.relatedUser = theModel._id;
      // theModel.rootUser = userDoc._id;
      // return Promise.all([theWallet.save(), theModel.save()]);

      //   return Promise.all([
      //     Wallet.findByIdAndUpdate(
      //       theWallet._id,
      //       {
      //         rootUser: userDoc._id,
      //         relatedUser: theModel._id,
      //       },
      //       { new: true }
      //     ).lean(),
      //     Model.findByIdAndUpdate(
      //       {
      //         rootUser: userDoc._id,
      //       },
      //       { new: true }
      //     ).lean(),
      //   ]);
    })
    .catch((err) => {
      Promise.all([
        Wallet.deleteOne({
          _id: theWallet._id,
        }),
        Model.deleteOne({
          _id: theModel._id,
        }),
        User.deleteOne({
          _id: theUserId,
        }),
      ])
        .then((results) => {
          console.log("end error >>>", err)
          const error = new Error(err.message || "Model was not registered")
          error.statusCode = err.statusCode || 500
          error.data = {
            code: err.code,
          }
          next(err)
        })
        .catch((_err) => next(err))
    })
}
