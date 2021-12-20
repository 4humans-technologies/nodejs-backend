const redis = require("redis")
const client = redis.createClient()

client.on("error", function (error) {
  console.error(error)
})

client.on("connect", function () {
  console.log("Connected!")
})

client.get("name", (error, name) => {
  console.log("value from name", name)
})

client.set("name", "kkkkkkk", (error, name) => {
  console.log("value from name", name)
})

module.exports = client
