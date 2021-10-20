const { body } = require("express-validator")
const Model = require("../../models/userTypes/Model")
const router = require("express").Router()
const modelController = require("../../controllers/register/modelController")
const fs = require("fs")
const multer = require("multer")
const { nanoid } = require("nanoid")
const { extname } = require("path")

// ✔✔✔✔✔✔
// MULTER STORAGE ENGINE
const modelProfileImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `./images/model/${req.body.username}/profile/`
    fs.exists(dir, (dirExists) => {
      if (!dirExists) {
        fs.mkdir(
          dir,
          {
            recursive: true,
          },
          (err) => {
            if (err) {
              cb("Could not create directory")
            } else {
              cb(null, dir)
            }
          }
        )
      } else {
        cb(null, dir)
      }
    })
  },
  filename: function (req, file, cb) {
    const name = `${nanoid(10)}__${file.originalname}`
    cb(null, name)
  },
})

const modelProfileImageUpload = multer({
  storage: modelProfileImageStorage,
  fileFilter: function (req, file, cb) {
    const fileTypes = /png|webp|svg|jpg|jpeg/
    const extnameTest = fileTypes.test(extname(file.originalname).toLowerCase())
    const mimetypeTest = fileTypes.test(file.mimetype)
    if (extnameTest && mimetypeTest) {
      return cb(null, true)
    } else {
      cb("Error: only .png, .webp, .svg .jpg .jpeg images are allowed")
    }
  },
}).single("profileImage")

router.post(
  "/create",
  modelProfileImageUpload,
  (req, res, next) => {
    if (req.file === undefined) {
      const error = new Error("No file was selected or sent")
      error.statusCode = 422
      return next(error)
    }
    //   req.uploadUrl = `./images/model/${req.body.username}/profile-image/${req.file.filename}`
    next()
  },
  modelController.createModel
)

const modelDocumentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `./images/model/${req.body.username}/documents/`
    fs.exists(dir, (dirExists) => {
      if (!dirExists) {
        fs.mkdir(
          dir,
          {
            recursive: true,
          },
          (err) => {
            if (err) {
              cb("Could not create directory")
            } else {
              cb(null, dir)
            }
          }
        )
      } else {
        cb(null, dir)
      }
    })
  },
  filename: function (req, file, cb) {
    const name = `${nanoid(10)}__model_doc__${file.originalname}`
    cb(null, name)
  },
})

const modelDocumentUpload = multer({
  storage: modelDocumentStorage,
  fileFilter: function (req, file, cb) {
    const fileTypes = /png|jpg|jpeg/
    const extnameTest = fileTypes.test(extname(file.originalname).toLowerCase())
    const mimetypeTest = fileTypes.test(file.mimetype)
    if (extnameTest && mimetypeTest) {
      return cb(null, true)
    } else {
      cb("Error: only .png, .jpg .jpeg images are allowed")
    }
  },
}).array("document", 2)

router.post("/", modelDocumentUpload, modelController.handleDocumentUpload)

module.exports = router
