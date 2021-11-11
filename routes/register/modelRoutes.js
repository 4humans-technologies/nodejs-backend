const Model = require("../../models/userTypes/Model")
const router = require("express").Router()
const modelController = require("../../controllers/register/modelController")
const fs = require("fs")
const multer = require("multer")
const { nanoid } = require("nanoid")
const { extname } = require("path")
const { body, validationResult } = require("express-validator")
const User = require("../../models/User")

router.post(
  "/create",
  [
    body("username")
      .trim()
      .notEmpty()
      .isString()
      .isLength({ min: 5, max: 24 })
      .custom((value, { req }) => {
        return User.findOne({ username: req.body.username }).then((user) => {
          if (user) {
            return Promise.reject("User name already exists")
          }
        })
      })
      .toLowerCase(),
    body("password").notEmpty().isString(),
    body("age").notEmpty().isNumeric(),
    body("name").notEmpty().isString().trim().escape().toLowerCase(),
    body("email").notEmpty().isEmail().normalizeEmail(),
    body("gender").notEmpty().isString(),
    body("profileImage").notEmpty().isURL(),
    body("languages").notEmpty().isString(),
    // body("phone").notEmpty(),
  ],
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
