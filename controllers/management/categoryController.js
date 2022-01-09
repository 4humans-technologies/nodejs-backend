const Category = require("../../models/management/category")
const controllerErrorCollector = require("../../utils/controllerErrorCollector")
const { Types } = require("mongoose")

exports.createCategory = (req, res, next) => {
  controllerErrorCollector(req)

  const { name, description, parentId } = req.body
  // console.log("parentId >>",parentId);
  // console.log("req.user >>",req.user);

  if (parentId) {
    Category.findById(parentId)
      .then((parent) => {
        const ancestors = parent.ancestors
        ancestors.push(Types.ObjectId(parentId))
        return Category({
          name: name,
          description: description || "No description",
          parent: parentId,
          ancestors: [...ancestors],
          createdBy: req.user._id,
        }).save()
      })
      .then((category) => {
        if (!category) {
          const error = new Error("category not created")
          throw error
        }
        res.status(201).json({
          message: "new category created successfully",
          actionStatus: "success",
          doc: category,
        })
      })
      .catch((err) => next(err))
  } else {
    // if parentId is null
    Category({
      name: name,
      description: description || "No description",
      parent: null,
      ancestors: [],
      createdBy: req.user._id,
    })
      .save()
      .then((category) => {
        if (!category) {
          const error = new Error("category not created")
          throw error
        }
        res.status(201).json({
          message: "new category created successfully",
          actionStatus: "success",
          doc: category,
        })
      })
      .catch((err) => next(err))
  }
}
