const Wallet = require("../../models/globals/wallet");
const User = require("../../models/User");
const Viewer = require("../../models/userTypes/Viewer");
const paginator = require("../../utils/paginator")

const controllerErrorCollector = require("../../utils/controllerErrorCollector");

exports.createViewer = (req, res, next) => {
    /**
     * result: this will create a user and viewer, wallet will
        be automatically with given initial amount.
        useCase: only for admin to add a new viewer | user and wallet creation will be automatic
        gotchas: logged user must have REQUIRED permissions
        */
    controllerErrorCollector(req, "Invalid form details, please try again")

    const { username, password, name, screenName, email, phone, gender, walletAmount, following, hobbies, approved } = req.body
    let theWallet, theViewer, theUser;

    Wallet({
        userType: "Viewer",
        currentAmount: +walletAmount
    })
        .save({ validateBeforeSave: false })
        .then(wallet => {
            theWallet = wallet
            return Viewer({
                name: name,
                email: email,
                phone: phone,
                gender: gender,
                screenName: screenName,
                hobbies: Array.from(hobbies || []),
                following: Array.from(following || []),
                wallet: wallet
            }).save({ validateBeforeSave: false })
        })
        .then(viewer => {
            theViewer = viewer
            const salt = bcrypt.genSaltSync(5)
            const hashedPassword = bcrypt.hashSync(password, salt)
            return User({
                username: username,
                password: hashedPassword,
                permissions: role.permissions,
                role: role,
                userType: "Viewer",
                relatedUser: theViewer,
                needApproval: approved || false,
                meta: {
                    lastLogin: new Date().toISOString()
                }
            }).save()
        })
        .then(userDoc => {
            theUser = userDoc

            theWallet.rootUser = userDoc._id
            theWallet.relatedUser = theViewer._id
            theViewer.rootUser = userDoc._id
            return Promise.all([theWallet.save(), theViewer.save()])
        })
        .then(values => {
            res.status(201).json({
                message: "viewer added successfully",
                actionStatus: "success",
            })
        })
        .catch(err => {
            try {
                // if registeration failed delete all the models created
                theWallet.remove(function (err, doc) {
                    console.log("wallet removed ", doc);
                })
                theViewer.remove(function (err, doc) {
                    console.log("viewer removed ", doc);
                })
                theUser.remove(function (err, doc) {
                    console.log("viewer removed ", doc);
                })
            } catch (error) {
                console.log("try error >>>", error.message);
            }
            console.log("end error >>>", err)
            const error = new Error(err.message || "viewer not registered")
            error.statusCode = err.statusCode || 500
            next(error)
        })
}

exports.getUser = (req, res, next) => {
    controllerErrorCollector(req, "Invalid form details, please try again")

    const { viewerId } = req.body
    const select = "rootUser.role rootUser.permissions wallet.rootUser wallet.relatedUser wallet.userType streams giftHistory"
    Viewer.findById(viewerId)
        .populate("rootUser", "wallet", "following", "purchaseHistory")
        .then(viewer => {
            res.status(200).json({
                actionStatus: "success",
                message: "viewer fetched from the database successfully",
                docType: "viewer",
                doc: viewer,
            })
        }).catch(err => next(err))
}

exports.getUsers = (req, res, next) => {
    /**
     * empty query obj as have to simply get users
     * 🔴 how to improve sorting ability 🔴
     */

    const qry = {}
    paginator.withNormal(Viewer, qry, select, req, res)
        .catch(err => next(err))
}

exports.updateUser = (req, res, next) => {
    /**
     * 🔴 Not completed 🔴
     */

    const { username, password, name, screenName, email, phone, gender, walletAmount, following, hobbies, approved } = req.body
    let theWallet, theViewer, theUser;
}

exports.removeUsers = (req, res, next) => {
    /**
     * only end to remove user(s), be it one or many
     */

    const { viewerIds } = req.body
    const userIds = []
    const walletIds = []
    Viewer.find({ _id: { $in: viewerIds } }, "wallet rootUser")
        .then(viewers => {
            viewers.forEach(viewer => {
                userIds.push(viewer.rootUser._id)
                walletIds.push(viewer.wallet._id)
            })
            return Promise.all([
                Viewer.deleteMany({ _id: { $in: viewerIds } }),
                User.deleteMany({ _id: { $in: userIds } }),
                Wallet.deleteMany({ _id: { $in: walletIds } })
            ])
        }).then(values => {
            res.status(200).json({
                result: values
            })
        }).catch(err => next(err))
}