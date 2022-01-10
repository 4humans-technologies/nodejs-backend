const Approval = require("../../../../models/management/approval")
const Model = require("../../../../models/userTypes/Model")
const Wallet = require("../../../../models/globals/wallet")
const ObjectId = require("mongodb").ObjectId
const User = require("../../../../models/User")

module.exports = (data, req) => {
  /**
   * create new models
   */

  /**
   * key assumption on which i'am making his controller
   * 1 - document url will be sent not file object, will handle upload to s3 in the data provider itself
   * 2 - can't add followers from admin
   * 3 - the model will be approved upfront and the creator will by the approver also
   * 4 - "needApproval" cannot be false and email and phone be unVerified, hence have to mark email and phone as verified too
   */

  /**
   * expected data format
   * data = {
   *    model:{},
   *    user:{},
   *    approval:{},
   *    document:{}
   * }
   */

  const walletId = new ObjectId()
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()
  const approvalId = new ObjectId()
  const documentId = new ObjectId()

  if (true) {
    return
  }

  return Promise.all([
    Wallet({
      _id: walletId,
      userType: "Model",
      currentAmount: 0,
      rootUser: advRootUserId,
      relatedUser: advRelatedUserId,
    }).save(),
    Model({
      _id: advRelatedUserId,
      rootUser: advRootUserId,
      advRelatedUserId: advRelatedUserId,
      dob: new Date().getFullYear() - data.age,
      wallet: walletId,
      approval: approvalId,
      documents: documentId,
      ...data.model,
    }).save(),
    User({
      userType: "Model",
      relatedUser: advRelatedUserId,
      ...data.user,
    }).save(),
    Approval({
      _id: approvalId,
      forModel: advRootUserId,
      roleDuringApproval: req.user.role,
      by: req.user._id,
      remarks: data.approval.remarks,
    }).save(),
    Document({
      _id: documentId,
      model: advRelatedUserId,
      ...data.document,
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
       * delete all the created docs
       */
      return Promise.all([
        Wallet.deleteOne({ _id: walletId }),
        Model.deleteOne({ _id: advRelatedUserId }),
        User.deleteOne({ _id: advRootUserId }),
        Approval.deleteOne({ _id: approvalId }),
        Document.deleteOne({ _id: documentId }),
      ]).finally(() => {
        throw err
      })
    })
}
