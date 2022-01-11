const router = require("express").Router()
const viewerController = require("../../controllers/register/viewerController")
const { body, validationResult } = require("express-validator")
const User = require("../../models/User")

router.post(
  "/",
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
    body("name").notEmpty().isString().trim().escape().toLowerCase(),
    body("email").notEmpty().isEmail().normalizeEmail(),
    body("gender").notEmpty().isString(),
    body("profileImage").isURL(),
  ],
  viewerController.createViewer
)

module.exports = router
