const Model = require("../../../../models/userTypes/Model")
const Viewer = require("../../../../models/userTypes/Viewer")
const Staff = require("../../../../models/userTypes/Staff")
const SuperAdmin = require("../../../../models/userTypes/SuperAdmin")
const Approval = require("../../../../models/management/approval")
const Tag = require("../../../../models/management/tag")
const Role = require("../../../../models/Role")
const Permission = require("../../../../models/Permission")
const Log = require("../../../../models/log/log")
const createModel = require("./createModel")
const createViewer = require("./createViewer")

module.exports = (req, res, next) => {
  /**
   * create a new resource, with post request
   */

  /**
   * dataProvider.create('posts', { data: { title: "hello, world" } });
   */

  const { resource } = req.params
  const data = JSON.parse(req.body.data)

  var createQuery
  switch (resource) {
    case "Model":
      /**
       * create new model
       */
      createQuery = createModel(data, req)
      break
    case "Viewer":
      /**
       * create new viewer
       */
      createQuery = createViewer(data, req)
      break
    case "Tag":
      createQuery = Tag({
        name: data.name,
      }).save()
      break
    case "Approval":
      Approval({
        forModel: data.forModel,
        roleDuringApproval: req.user.role,
        by: req.user._id,
        remarks: data.remarks,
      })
      break
    case "Role":
      Permission.find(
        {
          _id: {
            $in: data.permissions,
          },
        },
        "value"
      )
        .then((permissions) => {
          if (permissions.length !== 0) {
            return Role({
              permissions: permissions.map((permission) => permission.value),
              permissionIds: data.permissions,
              roleName: data.name,
              createdBy: req.user._id,
            })
              .save()
              .then((role) => {
                res.status(201).json({
                  message: `role ${data.name} was created successfully`,
                  actionStatus: "success",
                  doc: role,
                })
              })
          } else {
            const error = new Error("selected permission(s) were not found")
            error.statusCode = 400
            throw error
          }
        })
        .catch((err) => {
          const error = new Error("Role not created")
          error.statusCode = err.status || err.statusCode || 500
          return next(err)
        })
      break
    default:
      break
  }

  createQuery
    .then(({ createdResources, logField, logFieldValue }) => {
      /**
       * expecting "logField" & "logFieldValue" in the result
       * to construct proper log string
       */
      return Promise.all([
        createdResources,
        Log({
          action: `create new ${resource}, with ${logField}: ${logFieldValue}`,
          by: req.user._id,
        }).save(),
      ])
    })
    .then(([createdResources, _log]) => {
      /**
       * add a log entry also after  successful creation of a record
       */
      return res.status(2001).json(createdResources)
    })
    .catch((err) => next(err))
}
