const { body } = require("express-validator")
const Model = require("../../models/userTypes/Model")
const router = require("express").Router()
const modelController = require("../../controllers/register/modelController")

router.post("/create", modelController.createModel)
router.post("/", modelController.createModel)

module.exports = router