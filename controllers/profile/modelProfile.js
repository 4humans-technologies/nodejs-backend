const Model = require("../../models/userTypes/Model")
const User = require("../../models/User")
const bcrypt = require("bcrypt")
const CoinsSpendHistory = require("../../models/globals/coinsSpendHistory")
const {
  generateEmailConformationJWT,
} = require("../../utils/generateEmailConformationJWT")
const { sendModelEmailConformation } = require("../../sendgrid")
const ImageAlbum = require("../../models/globals/ImageAlbum")
const VideoAlbum = require("../../models/globals/VideosAlbum")
const ObjectId = require("mongodb").ObjectId
const { deleteImages } = require("../../utils/aws/s3")

exports.getModelProfileData = (req, res, next) => {
  Model.findById(req.user.relatedUser._id)
    .populate("rootUser")
    .populate("approval")
    .populate("adminPriceRange")
    .populate("currentStream")
    .populate("videoCallHistory")
    .populate("audioCallHistory")
    .populate("pendingCalls.audioCalls")
    .populate("pendingCalls.videoCalls")
    .populate("Tags")
    .populate("wallet")
    .select("-streams")
    .then((model) => {
      res.status(200).json({
        actionStatus: "success",
        model: model,
      })
    })
    .catch((err) => next(err))
}

exports.updateTipMenuActions = (req, res, next) => {
  /* will replace previous actions with the new ones, no merging */
  const { newActions } = req.body

  var hasInvalidValue = false

  newActions.forEach((entry) => {
    if (entry.action.trim() === "") {
      hasInvalidValue = true
    }
  })

  if (!hasInvalidValue) {
    Model.findById(req.user.relatedUser._id)
      .select("tipMenuActions")
      .then((model) => {
        if (newActions.length !== 0) {
          model.tipMenuActions = {
            actions: newActions,
            lastUpdated: new Date(),
          }
        }
        return model.save()
      })
      .then((model) => {
        if (model) {
          res.status(200).json({
            actionStatus: "success",
          })
        }
      })
      .catch((err) => next(err))
  } else {
    return res.status(422).json({
      actionStatus: "failed",
      message: "activity name cannot be empty!",
    })
  }
}

exports.getCallHistory = (req, res, next) => {}

exports.updateCallChargesAndMinDuration = (req, res, next) => {
  /*  */
  const { charges, minCallDuration } = req.body

  Model.findById(req.user.relatedUser._id)
    .select("charges minCallDuration")
    .then((model) => {
      model.charges = charges
      model.minCallDuration = +minCallDuration
      return model.save()
    })
    .then((model) => {
      return res.status(200).json({
        actionStatus: "success",
      })
    })
    .then((err) => next(err))
}

exports.updateEmail = (req, res, next) => {
  const { newEmail, password } = req.body

  let theUser
  let wasEmailSent
  User.findById(req.user._id)
    .select("password")
    .then((user) => {
      theUser = user
      return bcrypt.compare(user.password, password)
    })
    .then((didMatched) => {
      if (didMatched) {
        return Promise.all([
          User.updateOne(
            {
              _id: req.user._id,
            },
            {
              "inProcessDetails.emailVerified": false,
              needApproval: true,
            }
          ),
          Model.findByIdAndUpdate(
            {
              _id: req.relatedUser._id,
            },
            {
              $set: { email: newEmail },
            },
            { new: true }
          )
            .select("email")
            .lean(),
        ])
      } else {
        const error = new Error("Invalid credentials")
        error.statusCode = 422
        throw error
      }
    })
    .then(([user, model]) => {
      /* send the email conformation link */
      if (model.email === newEmail && user.n === 1) {
        /* send conformation email */
        const emailToken = generateEmailConformationJWT({
          userId: req.user._id,
          relatedUserId: req.user.relatedUser._id,
          userType: req.user.userType,
        })
        try {
          sendModelEmailConformation({
            to: newEmail,
            dynamic_template_data: {
              confirm_url: `${
                process.env.FRONTEND_URL.includes("localhost")
                  ? "http"
                  : "https"
              }://${
                process.env.FRONTEND_URL
              }/link-verification/email?token=${emailToken}`,
              first_name: req.user.relatedUser.name.split(" ")[0],
              confirm_before:
                +process.env.EMAIL_CONFORMATION_EXPIRY_HOURS_MODEL / 24,
            },
          })
          wasEmailSent = true
        } catch (error) {
          wasEmailSent = false
        }
      }
    })
    .then(() => {
      /* logout the model on the client  */
      return res.status(200).json({
        actionStatus: "success",
        message: "Your email was successfully updated to " + newEmail,
        wasEmailSent: wasEmailSent,
        action: "logout",
      })
    })
    .catch((err) => next(err))
}

exports.updatePassword = (req, res, next) => {
  const { oldPassword, newPassword, newPasswordConformation } = req.body
  if (newPassword !== newPasswordConformation) {
    return res.status(400).json({
      actionStatus: "failed",
      message: "Password conformation did not match!",
    })
  }

  let theUser
  User.findById(req.user._id)
    .select("password")
    .then((user) => {
      theUser = user
      return bcrypt.compare(oldPassword, user.password)
    })
    .then((didMatched) => {
      if (didMatched) {
        return bcrypt.genSalt(5)
      } else {
        const error = new Error(
          "Invalid credentials, Previous password is incorrect!"
        )
        error.statusCode = 400
        throw error
      }
    })
    .then((salt) => {
      return bcrypt.hash(newPassword, salt)
    })
    .then((hashedPassword) => {
      theUser.password = hashedPassword
      return theUser.save()
    })
    .then(() => {
      return res.status(200).json({
        actionStatus: "success",
        message: "Password was updated to new value successfully",
      })
    })
    .catch((err) => next(err))
}

exports.updateModelBasicDetails = (req, res, next) => {
  /**
   * this blocks working is under observation dont' use it
   */
  const { updatedData, deleteObjects } = req.body

  const userData = {}

  if (updatedData?.username) {
    userData["username"] = updatedData.username
  }

  const queryArray = updatedData?.userName
    ? [
        Model.findByIdAndUpdate(
          req.user.relatedUser._id,
          {
            ...updatedData,
          },
          {
            runValidators: true,
          }
        ).lean(),
        User.findByIdAndUpdate(req.user._id, {
          ...userData,
        }).lean(),
      ]
    : [
        Model.findByIdAndUpdate(
          req.user.relatedUser._id,
          {
            ...updatedData,
          },
          {
            runValidators: true,
          }
        ).lean(),
      ]

  if (deleteObjects && deleteObjects.length > 0) {
    queryArray.push(deleteImages(deleteObjects))
  }

  const query = Promise.all(queryArray)

  query
    .then((values) => {
      const updatedModel = values[0]
      const updatedUser = values?.[1]
      return res.status(200).json({
        actionStatus: "success",
        theModel: { ...updatedModel, rootUser: updatedUser },
      })
    })
    .catch((err) => next(err))
}

exports.handlePublicImageUpload = (req, res, next) => {
  const { newImageUrl } = req.body

  Model.updateOne(
    {
      _id: req.user.relatedUser._id,
    },
    {
      $addToSet: { publicImages: newImageUrl },
    }
  )
    .then((result) => {
      if (result.n === 1) {
        return res.status(200).json({
          actionStatus: "success",
        })
      } else {
        return res.status(200).json({
          actionStatus: "failed",
        })
      }
    })
    .catch((err) => next(err))
}

exports.createContentAlbum = (req, res, next) => {
  const { name, price, type } = req.body

  const myId = ObjectId()
  const query =
    type === "imageAlbum"
      ? ImageAlbum({
          _id: myId,
          name: name,
          price: price,
        }).save()
      : VideoAlbum({
          _id: myId,
          name: name,
          price: price,
        }).save()

  Promise.all([
    query,
    Model.updateOne(
      {
        _id: req.user.relatedUser._id,
      },
      {
        $addToSet:
          type === "imageAlbum"
            ? { privateImages: myId }
            : { privateVideos: myId },
      }
    ),
  ])
    .then(([album, model]) => {
      return res.status(200).json({
        actionStatus: 200,
        album: album,
      })
    })
    .catch((err) => next(err))
}

exports.handlePrivateImageUpload = (req, res, next) => {
  /**
   * no use here but usefull snippet
   * ------------------------------
   * {
      $push: {
        "privateImages.$[entry].originalImages": originalImageURL,
        "privateImages.$[entry].thumbnails": thumbUrl,
      },
    },
    {
      arrayFilters: [{ "entry.model": req.user.relatedUser._id.toString() }],
      upsert: true,
    }
   */
  const { originalImageURL, thumbUrl, albumId } = req.body

  ImageAlbum.updateOne(
    {
      _id: albumId,
    },
    {
      $push: {
        originalImages: originalImageURL,
        thumbnails: thumbUrl,
      },
    }
  )
    .then((result) => {
      if (result.n === 1) {
        return res.status(200).json({
          actionStatus: "success",
        })
      } else {
        return res.status(200).json({
          actionStatus: "failed",
        })
      }
    })
    .catch((err) => next(err))
}

exports.handlePrivateVideoUpload = (req, res, next) => {
  const { originalVideoURL, thumbUrl, albumId } = req.body

  VideoAlbum.updateOne(
    {
      _id: albumId,
    },
    {
      $push: {
        originalVideos: originalVideoURL,
        thumbnails: thumbUrl,
      },
    }
  )
    .then((result) => {
      if (result.n === 1) {
        return res.status(200).json({
          actionStatus: "success",
        })
      } else {
        return res.status(200).json({
          actionStatus: "failed",
        })
      }
    })
    .catch((err) => next(err))
}

exports.handlePublicVideosUpload = (req, res, next) => {
  const { newVideoUrl } = req.body

  Model.updateOne(
    {
      _id: req.user.relatedUser._id,
    },
    {
      $addToSet: { publicVideos: newVideoUrl },
    }
  )
    .then((result) => {
      if (result.n === 1) {
        return res.status(200).json({
          actionStatus: "success",
        })
      } else {
        return res.status(200).json({
          actionStatus: "failed",
        })
      }
    })
    .catch((err) => next(err))
}

exports.updateInfoFields = (req, res, next) => {
  let fieldsToUpdate = {}
  let deleteUrls = []

  req.body.forEach((field) => {
    fieldsToUpdate[field.field] = field.value
    if (field.deleteUrl) {
      deleteUrls.push(field.deleteUrl)
    }
  })

  Model.updateOne(
    {
      _id: req.user.relatedUser._id,
    },
    { $set: fieldsToUpdate },
    { runValidators: true }
  )
    .then(() => {
      if (deleteUrls.length !== 0) {
        deleteImages(deleteUrls)
          .then(() => {
            return res.status(200).json({
              actionStatus: "success",
              updatedFields: Object.keys(fieldsToUpdate),
            })
          })
          .catch((err) => next(err))
      } else {
        return res.status(200).json({
          actionStatus: "success",
          updatedFields: Object.keys(fieldsToUpdate),
        })
      }
    })
    .catch((err) => {
      if (err.name === "ValidationError") {
        const errStrings = []
        Object.keys(err.toJSON().errors).forEach((errKey) => {
          errStrings.push(err.errors[errKey].message)
        })
        const error = new Error(errStrings.join(" and "))
        error.statusCode = 422
        return next(error)
      }
      return next(err)
    })
}

exports.deletePublicContent = (req, res, next) => {
  const { urls, type } = req.body

  if (type === "Images") {
    deleteImages(urls)
      .then(({ Deleted, Errors }) => {
        if (Errors.length > 0) throw Errors
        console.log(`${Deleted.length} images`)
        Model.updateOne(
          { _id: req.user.relatedUser._id },
          {
            $pull: { publicImages: { $in: urls } },
          }
        ).then((result) => {
          console.log("Update results : ", result.nModified)
          return res.status(200).json({
            actionStatus: "success",
            DeletedContent: Deleted.map((item) => item.Key),
          })
        })
      })
      .catch((err) => next(err))
  } else if (type === "Videos") {
    deleteImages(urls)
      .then(({ Deleted, Errors }) => {
        if (Errors.length > 0) throw Errors
        console.log(`${Deleted.length} videos`)
        Model.updateOne(
          { _id: req.user.relatedUser._id },
          {
            $pull: { publicVideos: { $in: urls } },
          }
        ).then((result) => {
          console.log("Update results : ", result.nModified)
          return res.status(200).json({
            actionStatus: "success",
            DeletedContent: Deleted.map((item) => item.Key),
          })
        })
      })
      .catch((err) => next(err))
  }
}

exports.deleteAlbum = (req, res, next) => {
  const { albumId, type } = req.body
  let originals
  let thumbs
  if (type === "ImageAlbum") {
    ImageAlbum.findById(albumId)
      .lean()
      .then((album) => {
        if (!album) {
          throw new Error("Invalid Album Id")
        }
        originals = album.originalImages
        thumbs = album.thumbnails
        if (originals.length + thumbs.length === 0) {
          return Promise.all(["Album Empty"])
        }
        return Promise.all([deleteImages(originals), deleteImages(thumbs)])
      })
      .then((deleteResult) => {
        console.log("Delete results : ", deleteResult)
        return ImageAlbum.findByIdAndRemove(albumId)
      })
      .then(() => {
        return res.status(200).json({
          actionStatus: "success",
        })
      })
      .catch((err) => next(err))
  } else if (type === "VideosAlbum") {
    VideoAlbum.findById(albumId)
      .lean()
      .then((album) => {
        if (!album) {
          throw new Error("Invalid Album Id")
        }
        originals = album.originalVideos
        thumbs = album.thumbnails
        if (originals.length + thumbs.length === 0) {
          return Promise.all(["Album Empty"])
        }
        return Promise.all([deleteImages(originals), deleteImages(thumbs)])
      })
      .then((deleteResult) => {
        console.log("Delete results : ", deleteResult)
        return VideoAlbum.findByIdAndRemove(albumId)
      })
      .then(() => {
        return res.status(200).json({
          actionStatus: "success",
        })
      })
      .catch((err) => next(err))
  }
}

exports.getAskedFields = (req, res, next) => {
  const { fetchFields } = req.body

  Model.findById({
    _id: req.user.relatedUser._id,
  })
    .lean()
    .select(fetchFields)
    .then((fields) => {
      return res.status(200).json({
        actionStatus: "success",
        fields: fields,
      })
    })
    .catch((err) => next(err))
}

exports.getTokenHistoryOfModel = (req, res, next) => {
  CoinsSpendHistory.find({
    forModel: req.user.relatedUser._id,
  })
    .populate({
      path: "by",
      select: "name profileImage",
    })
    .lean()
    .then((history) => {
      return res.status(200).json({
        actionStatus: "success",
        results: history,
      })
    })
    .catch((err) => next(err))
}
