const generateCode = require("./generateCode")
const Permission = require("../models/Permission")

// const User = require("../models/User")
// const Role = require("../models/Role")

// // globals
// const Wallet = require("../models/globals/wallet")
// const CoinPurchase = require("../models/globals/coinPurchase")
// const GiftPurchase = require("../models/globals/gitfPurchase")
// const Gift = require("../models/globals/Gift")
// const Stream = require("../models/globals/Stream")
// const AudioCall = require("../models/globals/audioCall")
// const VideoCall = require("../models/globals/videoCall")

// // usertypes
// const Model = require("../models/userTypes/Model")
// const Viewer = require("../models/userTypes/Viewer")

// const allDBModels = [
//     {
//         model:User,
//         name:"User"
//     },
//     {
//         model:Role,
//         name:"Role"
//     },
//     {
//         model:Permission,
//         name:"Permission"
//     },
//     {
//         model:Wallet,
//         name:"Wallet"
//     },
//     {
//         model:CoinPurchase,
//         name:"the user model"
//     },
//     {
//         model:GiftPurchase,
//         name:"CoinPurchase"
//     },
//     {
//         model:Gift,
//         name:"Gift"
//     },
//     {
//         model:Stream,
//         name:"Stream"
//     },
//     {
//         model:AudioCall,
//         name:"AudioCall"
//     },
//     {
//         model:VideoCall,
//         name:"VideoCall"
//     },
//     {
//         model:Model,
//         name:"Model"
//     },
//     {
//         model:Viewer,  
//         name:"Viewer"
//     },
// ]

const generatePermissionsForModel = (modelName) => {
    const permissionStrings = ["create", "read", "update", "delete"].map(action => {
        const permissionString = `${action}-${modelName}`
        return {
            value: permissionString,
            code: generateCode(permissionString)
        }
    })
    console.log("generating permissions");
    return Permission.insertMany([...permissionStrings])
}

module.exports.generatePermissionsForModel = generatePermissionsForModel