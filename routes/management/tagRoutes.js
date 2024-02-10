const router = require("express").Router()
const { body } = require("express-validator");
const tokenVerify = require("../../middlewares/tokenVerify");
const tagController = require("../../controllers/management/tagController")

const tagValidators = [
    body("name").notEmpty().isString(),
    body("description").isString(),
    body("tagGroupIds").isArray()
]

const tagGroupValidators = [
    body("name").notEmpty().isString(),
    body("description").notEmpty().isString(),
    body("tagIds").isArray()
]

router.post("/create-tag", tokenVerify, tagValidators, tagController.createTag)
router.post("/create-taggroup", tokenVerify, tagGroupValidators, tagController.createTagGroup)
router.post("/update-tag", tokenVerify, tagValidators, tagController.updateTag)
router.post("/update-taggroup", tokenVerify, tagGroupValidators, tagController.updateTagGroup)
router.get("/remove-tag/:id", tokenVerify, tagController.removeTag)
router.get("/remove-taggroup/:id", tokenVerify, tagController.removeTagGroup)
router.get("/get-tag/:id", tokenVerify, tagController.getTag)
router.get("/get-taggroup/:id", tokenVerify, tagController.getTagGroup)
router.get("/get-tags", tokenVerify, tagController.getTags)
router.get("/get-taggroup", tokenVerify, tagController.getTagGroups)


module.exports = router
