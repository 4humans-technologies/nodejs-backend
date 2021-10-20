const router = require("express").Router()
const multer = require("multer")
const { nanoid } = require("nanoid")
const { extname } = require("path")
const giftsController = require("../../controllers/ADMIN/gift")

// ✔✔✔✔✔✔
// MULTER STORAGE ENGINE
const giftStorage = multer.diskStorage({
  destination: "./images/gifts",
  filename: function (req, file, cb) {
    cb(null, `${nanoid(8)}_${req.body.name}_gift${extname(file.originalname)}`)
  },
})

const giftUpload = multer({
  storage: giftStorage,
  fileFilter: function (req, file, cb) {
    const fileTypes = /png|webp|svg/
    const extTest = fileTypes.test(extname(file.originalname).toLowerCase())
    const mimetype = fileTypes.test(file.mimetype)
    if (mimetype && extTest) {
      return cb(null, true)
    } else {
      cb("Error: only .png, .webp, .svg images are allowed")
    }
  },
}).single("gift-image")

router.post("/create", giftUpload, giftsController.createGift)

module.exports = router
