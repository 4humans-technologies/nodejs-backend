const admin = require("firebase-admin")
let serviceAccount = require("./dreamgirl-firebase-creds.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://dreamgirl-dep1-default-rtdb.asia-southeast1.firebasedatabase.app",
})
