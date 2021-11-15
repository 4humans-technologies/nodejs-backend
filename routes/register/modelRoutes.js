const Model = require("../../models/userTypes/Model")
const router = require("express").Router()
const modelController = require("../../controllers/register/modelController")
const fs = require("fs")
const multer = require("multer")
const { nanoid } = require("nanoid")
const { extname } = require("path")
const { body, validationResult } = require("express-validator")
const User = require("../../models/User")
const tokenVerify = require("../../middlewares/tokenVerify")

router.post(
  "/create",
  [
    body("username")
      .trim()
      .notEmpty()
      .isString()
      .isLength({ max: 50 })
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
    body("phone").notEmpty(),
  ],
  modelController.createModel
)

router.post(
  "/handle-documents-upload",
  tokenVerify,
  [body("documentImages").isArray()],
  modelController.handleDocumentUpload
)

module.exports = router
