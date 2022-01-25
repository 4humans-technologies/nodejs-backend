const Approval = require("../../../../models/management/approval")
const Model = require("../../../../models/userTypes/Model")
const Wallet = require("../../../../models/globals/wallet")
const Document = require("../../../../models/globals/modelDocuments")
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
   */

  const walletId = new ObjectId()
  const advRootUserId = new ObjectId()
  const advRelatedUserId = new ObjectId()
  const approvalId = new ObjectId()
  const documentId = new ObjectId()

  const { wallet, rootUser, documents, approval, ...relatedUser } = data

  relatedUser.dob = new Date(relatedUser.dob).getFullYear()

  const creationPr = [
    Wallet({
      _id: walletId,
      userType: "Model",
      currentAmount: wallet.currentAmount,
      rootUser: advRootUserId,
      relatedUser: advRelatedUserId,
    }),
    Model({
      _id: advRelatedUserId,
      rootUser: advRootUserId,
      dob: new Date().getFullYear() - relatedUser.dob,
      wallet: walletId,
      approval: !rootUser.needApproval ? approvalId : undefined,
      documents: documents?.images ? documentId : undefined,
      ...relatedUser,
    }),
    User({
      _id: advRootUserId,
      userType: "Model",
      relatedUser: advRelatedUserId,
      ...rootUser,
    }),
  ]

  if (!rootUser.needApproval) {
    creationPr.push(
      Approval({
        _id: approvalId,
        forModel: advRootUserId,
        roleDuringApproval: "manager",
        by: req.user.userId,
        remarks: approval.remarks,
      })
    )
  }

  if (documents?.images) {
    if (documents.images.length > 0)
      creationPr.push(
        Document({
          _id: documentId,
          model: advRelatedUserId,
          isVerified: true,
          images: documents.images,
        })
      )
  }

  return Promise.all(creationPr.map((pr) => pr.save()))
    .then(([wallet, model, user, _v1, _v2]) => {
      const theModel = {
        ...model._doc,
        rootUser: {
          ...user._doc,
        },
        wallet: {
          ...wallet._doc,
        },
      }

      if (!rootUser.needApproval) {
        theModel.approval = _v1._doc
      }

      if (documents.images) {
        if (!rootUser.needApproval) {
          theModel.documents = _v2._doc
        } else {
          theModel.documents = _v1._doc
        }
      }

      return {
        createdResource: theModel,
        logMsg: `Model ${theModel.rootUser.username} was created successfully`,
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
