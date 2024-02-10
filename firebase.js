const admin = require("firebase-admin")
let serviceAccount = require("./dreamgirl-firebase-creds.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://dreamgirl-dep1-default-rtdb.asia-southeast1.firebasedatabase.app",
})

// const { getDatabase } = require("firebase-admin/database")
// console.log("removing public chats")
// getDatabase()
//   .ref("publicChats")
//   .remove()
//   .then((result) => {
//     console.log("public chats removed")
//     console.log("result :> ", result)
//   })
//   .catch((err) => console.error(err))

// console.log("getting public chats")
// getDatabase()
//   .ref("publicChats")
//   .once()
//   .then((result) => {
//     console.log("result :> ", result)
//   })
//   .catch((err) => console.error(err))
