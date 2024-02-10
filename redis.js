/* 
REDIS V4 setup 👇👇
const { createClient } = require("redis")

const client = createClient()
async function setUpRedis() {
  client.on("error", (err) => {
    console.error("Redis client error at startup : ", err)
  })

  client.on("connect", function () {
    console.log("==== connected to redis =====")
    // load all the roles in the memory
  })

  await client.connect()

  try {
    await client.set("test-value", "yes-its-working")
    console.info("test value was set!")

    const value = await client.get("test-value")
    console.info("test value was fetched :> ", value)
  } catch (err) {
    console.error("🔴 test value was set or fetched 🔴")
  }
}

// connect
setUpRedis()

module.exports = client
 */

/**
 * NODE REDIS V3 👇👇
 */

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
