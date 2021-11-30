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
            // const error = new Error("User name already exists")
            // error.statusCode = 422
            // throw error
            return Promise.reject("User name already exists")
          }
        })
      })
      .toLowerCase(),
    body("password").notEmpty().isString(),
    body("name").notEmpty().isString().trim().escape().toLowerCase(),
    body("email").notEmpty().isEmail().normalizeEmail(),
    body("gender").notEmpty().isString(),
    body("profileImage").isURL(),
    // body("phone").notEmpty(),
  ],
  viewerController.createViewer
)

module.exports = router
