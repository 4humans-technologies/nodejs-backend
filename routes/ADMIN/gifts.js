const router = require("express").Router()
const multer = require("multer")
const { nanoid } = require("nanoid")
const { extname } = require("path")


// ✔✔✔✔✔✔
// MULTER STORAGE ENGINE
const giftStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        switch (req.path) {
            case "api/admin/gift/create":
                const dest = "./images/gifts/"
                cb(null, dest)
                break;

            default:
                break;
        }
    },
    filename: function (req, file, cb) {
        cb(null, `${file.fieldname}-${nanoid(10)}`)
    }
})

const giftUpload = multer({
    storage: giftStorage,
    limits: {
        fileSize: 20*000 //20kB
    },
    fileFilter: function (req, file, cb) {
        const fileTypes = /png|webp|svg/
        fileTypes.test(extname(file.originalname).toLowerCase())
        fileTypes.test(file.mimetype)
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: only .png, .webp, .svg images are allowed');
        }
    }
}).single("gift-image")


router.post("/create", (req, res, next) => {
    giftUpload(req, res, (err) => {
        if (err) {
            return next(err)
        }
        if (req.file === undefined) {
            const error = new Error("No file was selected or sent")
            error.statusCode = 422
            return next(error)
        }
        req.uploadUrl = `images/gifts/${req.file.filename}`
    })
    // call next middleware
    next()
})


module.exports = router