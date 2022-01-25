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
      .isLength({ min: 2, max: 52 })
      .custom((value, { req }) => {
        return User.findOne({ username: value }).then((user) => {
          if (user) {
            return Promise.reject("User name already exists")
          }
        })
      })
      .custom((value) => {
        const chars = [
          "~",
          "`",
          "!",
          "@",
          "#",
          "$",
          "%",
          "^",
          "&",
          "*",
          "(",
          ")",
          "+",
          "=",
          "-",
          "{",
          "}",
          "[",
          "]",
          "|",
          '"',
          ":",
          ";",
          "'",
          "<",
          ">",
          "?",
          "|",
          "/",
          ".",
          ",",
          " ",
        ]
        const validity = {
          isValid: true,
          problemChars: [],
        }

        chars.forEach((char) => {
          if (value.includes(char)) {
            validity.isValid = validity.isValid && false
            validity.problemChars.push(char)
          } else {
            validity.isValid = validity.isValid && true
          }
        })

        if (!validity.isValid) {
          const error = new Error(
            validity.problemChars.join(" & ") + " are not allowed"
          )
          error.statusCode = 400
          throw error
        }
        return true
      }),
    body("password").notEmpty().isString(),
    body("age").notEmpty().isNumeric(),
    body("name").notEmpty().isString().trim().escape().toLowerCase(),
    body("email").notEmpty().isEmail().normalizeEmail(),
    body("gender").notEmpty().isString(),
    body("profileImage").notEmpty().isURL(),
    body("phone")
      .notEmpty()
      .isMobilePhone(["en-IN", "en-PK", "bn-BD", "ne-NP", "th-TH"]),
    // body("phone")
    //   .notEmpty()
    //   .isMobilePhone(["en-IN", "en-PK", "bn-BD", "ne-NP", "th-TH"]),
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
