const generateCode = require("./generateCode")
const Permission = require("../models/Permission")
const allDBModelsNames = require("./allDBModelsNames")

exports.generatePermissionsForModel = (modelName) => {
  const permissionStrings = ["create", "read", "update", "delete"].map(
    (action) => {
      const permissionString = `${action}-${modelName}`
      return {
        value: permissionString,
        code: generateCode(permissionString),
      }
    }
  )
  console.log("generating permissions")
  return Permission.insertMany([...permissionStrings])
}

exports.getPermissionsAtBulk = (all = false, modelNames = null) => {
  const permissionStrings = ["create", "read", "update", "delete"]
  const allGeneratedPermissions = []

  if (all) {
    // for (let i = 0; i < 1000; i++) {
    allDBModelsNames.forEach((modelName) => {
      permissionStrings.forEach((action) => {
        const permissionString = `${action}-${modelName.toLowerCase()}`
        allGeneratedPermissions.push({
          value: permissionString,
          code: generateCode(permissionString),
        })
      })
    })
    // }
    // console.log("generated all entries!")
    return allGeneratedPermissions
  } else {
    console.log("Bro, you have not setup for this 😏😏😏🔴")
  }
}
