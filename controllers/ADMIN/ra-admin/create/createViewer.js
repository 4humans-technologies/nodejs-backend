const Viewer = require("../../../../models/userTypes/Viewer")
const Wallet = require("../../../../models/globals/wallet")
const User = require("../../../../models/User")
const ObjectId = require("mongodb").ObjectId

module.exports = (data) => {
  /**
   * create new viewer
   */

  const walletId = new ObjectId()
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()

  return Promise.all([
    Wallet({
      _id: walletId,
      userType: "Viewer",
      currentAmount: data.wallet.currentAmount,
      rootUser: advRootUserId,
      relatedUser: advRelatedUserId,
    }).save(),
    Viewer({
      _id: advRelatedUserId,
      rootUser: advRootUserId,
      wallet: walletId,
      ...data.viewer,
    }).save(),
    User({
      _id: advRootUserId,
      userType: "Viewer",
      relatedUser: advRelatedUserId,
      ...data.user,
    }).save(),
  ])
    .then((results) => {
      return {
        createdResource: results,
        logField: "username",
        logFieldValue: data.user.username,
      }
    })
    .catch((err) => {
      /**
       * delete all the created records
       */
      return Promise.all([
        Wallet.deleteOne({ _id: walletId }),
        User.deleteOne({ _id: advRootUserId }),
        Viewer.deleteOne({ _id: advRelatedUserId }),
      ]).finally(() => {
        throw err
      })
    })
}
