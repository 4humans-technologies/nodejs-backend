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

exports.getPermissionsAtBulk = () => {
  const permissionStrings = ["create", "read", "update", "delete"]
  const allGeneratedPermissions = []

  allDBModelsNames.forEach(({ name, verbose }) => {
    permissionStrings.forEach((action) => {
      const permissionString = `${action}-${name}`
      allGeneratedPermissions.push({
        value: permissionString,
        verbose: `${action} 👉 ${verbose}`,
      })
    })
  })

  console.log(allGeneratedPermissions)
  return allGeneratedPermissions
}

// function a() {
//   const permissionStrings = ["create", "read", "update", "delete"]
//   const allGeneratedPermissions = []

//   allDBModelsNames.forEach(({ name, verbose }) => {
//     permissionStrings.forEach((action) => {
//       const permissionString = `${action}-${name}`
//       allGeneratedPermissions.push({
//         value: permissionString,
//         verbose: `${action} 👉 ${verbose}`,
//       })
//     })
//   })

//   console.log(allGeneratedPermissions)
//   return allGeneratedPermissions
// }
// a()
