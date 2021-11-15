const Model = require("../../models/userTypes/Model")
const User = require("../../models/User")
const Role = require("../../models/Role")
const Wallet = require("../../models/globals/wallet")
const errorCollector = require("../../utils/controllerErrorCollector")
const bcrypt = require("bcrypt")
const Approval = require("../../models/management/approval")
const paginator = require("../../utils/paginator")
const Tag = require("../../models/management/tag")
const PriceRange = require("../../models/management/priceRanges")
const Category = require("../../models/management/category")

exports.sendCreateData = (req, res, next) => {
    // get request
    Promise.all([
        Tag.find({}, "name"),
        PriceRange.find({}, "name minCharges maxCharges"),
        Category.find({}, "name")
    ])
        .then(values => {
            res.status(200).json({
                actionStatus: "success",
                tags: values[0],
                priceRanges: values[1],
                categories: values[2]
            })
        })
        .catch(err => next(err))
}

exports.createModel = (req, res, next) => {
    /**
     *🔴 as here, the model is being created from the admin
     * map the approval o model to the user creating this model
     * ----
     * check for permission of the admin
     */

    errorCollector(req, "Invalid form detail, please try again")

    const { username, password, name, screenName, email, phone,
        gender, DOB, bio, hobbies, sharePercent, adminPriceRange,
        charges, minCallDuration, timeForAcceptingCall,
        tags, currentAmount, needApproval } = req.body


    let theWallet, theModel, theUser, theApproval;

    Wallet({
        userType: "Model",
        currentAmount: currentAmount
    })
        .save({ validateBeforeSave: false })
        .then(wallet => {
            theWallet = wallet
            return Model({
                name,
                screenName,
                gender,
                email,
                phone,
                dob: DOB,
                wallet: wallet._id,
                bio,
                hobbies,
                sharePercent,
                adminPriceRange,
                charges,
                minCallDuration,
                timeForAcceptingCall,
                tags: tags
            })
        })
        .then(model => {
            theModel = model
            const salt = bcrypt.genSaltSync(5)
            const hashedPassword = bcrypt.hashSync(password, salt)
            return User({
                username: username,
                password: hashedPassword,
                // permissions: role.permissions,
                // role: role,
                userType: "model",
                relatedUser: theModel,
                needApproval: false,
                meta: {
                    lastLogin: () =>  new Date()
                }
            }).save()
        })
        .then(userDoc => {
            theUser = userDoc
            theWallet.rootUser = userDoc._id
            theWallet.relatedUser = theModel._id
            theModel.rootUser = userDoc._id

            if (!needApproval) {
                return Promise.all([theWallet.save(), theModel.save(), Approval({
                    forModel: theModel._id,
                    roleDuringApproval: req.user.role.name,
                    by: req.user._id,
                    remark: approvalRemark,
                    approvalTime: new Date()
                })])
            }
            return Promise.all([theWallet.save(), theModel.save()])
        })
        .then(values => {
            theApproval = values[2]
            res.status(201).json({
                message: needApproval ? "New model created successfully" : "New model created and approved successfully.",
                actionStatus: "success",
            })
        })
        .catch(err => {
            try {
                // if registration failed delete all the models created
                theWallet.remove(function (err, doc) {
                    console.log("wallet removed ", doc);
                })
                theModel.remove(function (err, doc) {
                    console.log("model removed ", doc);
                })
                theUser.remove(function (err, doc) {
                    console.log("user removed ", doc);
                })
                theApproval.remove(function (err, doc) {
                    console.log("approval removed ", doc);
                })
            } catch (error) {
                console.log("try error >>>", error.message);
            }
            console.log("end error >>>", err)
            const error = new Error(err.message || "model not registered, some error occurred")
            error.statusCode = err.statusCode || 500
            next(error)
        })
}

exports.getModel = (req, res, next) => {
    const { modelId } = req.params

    Model.findById(modelId)
        .then(model => {
            if (!model) {
                // ERROR 🔴
            }
            res.status(200).json({
                message: "model fetched from the database successfully",
                actionStatus: "success",
                docType: "model",
                doc: model,
            })
        }).catch(err => next(err))
}

exports.getModels = (req, res, next) => {
    /**
     * empty query obj as have to simply get users
     */

    const qry = {}
    paginator.withNormal(Model, qry, select, req, res)
        .catch(err => next(err))
}

exports.removeModel = (req, res, next) => {
    /**
     * only one endpoint to remove models
     */
    const { modelIds } = req.body
    const userIds = []
    const walletIds = []

    Model.find({ _id: { $in: modelIds } }, 'wallet rootUser')
        .then(models => {
            models.forEach(model => {
                userIds.push(model.rootUser._id)
                walletIds.push(model.wallet._id)
            })
            return Promise.all([
                Model.deleteMany({ _id: { $in: viewerIds } }),
                User.deleteMany({ _id: { $in: userIds } }),
                Wallet.deleteMany({ _id: { $in: walletIds } })
            ])
        })
        .then(values => {
            if (values.reduce((prev, curr) => prev + curr.n, 0) < modelIds.length * 3) {
                return res.status(200).json({
                    actionStatus: "success",
                    message: "some docs may not have been deleted, please rerun the command"
                })
            }
            return res.status(200).json({
                actionStatus: "success",
                message: "all the models have been deleted successfully"
            })
        }).catch(err => next(err))
}

exports.updateModel = (res, res, next) => {
    /**
     * i will get the list of fields which are updated from frontend
     */

    errorCollector(req, "Invalid form detail, please check again")
    const { modelId, updatedObj } = req.body

    Model.findOneAndUpdate({ _id: modelId }, updatedObj, { new: true })
        .then(model => {
            res.status(200).json({
                actionStatus: "success",
                message: "model updated successfully",
                docType: "model",
                doc: model
            })
        }).catch(err => next(err))
}