const { nanoid } = require("nanoid")

const procesStart = Date.now()
for (let num = 0; num < 100; num++) {
//   const start = Date.now()
  for (var i = 0; i < 1000; i++) {
    nanoid(64)
  }
//   console.log(`Completed test ${num} in : `, Date.now() - start)
}
console.log(`Average : ${(Date.now() - procesStart) / 100}`)
