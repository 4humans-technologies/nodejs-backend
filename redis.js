const redis = require("redis")
const client = redis.createClient()

client.on("error", function (error) {
  console.error(error)
})

client.on("connect", function () {
  console.log("==== connected to redis =====")
  /**
   * load all the roles in the memory
   */
  
})

module.exports = client
