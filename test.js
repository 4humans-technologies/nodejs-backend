const fetch = require("node-fetch")
const RUN_COUNT = 200
const socketId = "HYBE8014yUVo8EXHAACh"
const unAuthedUserId = "61add760c1a0c7c75b342ace"
for (let i = 0; i < RUN_COUNT; i++) {
  const start = Date.now()
  fetch(
    `http://localhost:8080/api/website/token-builder/unauthed-viewer-join-stream?socketId=${socketId}&unAuthedUserId=${unAuthedUserId}`,
    {
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        modelId: "61c2f27001d71c080fb2ae3f",
      }),
      method: "POST",
    }
  )
    .then((res) => res.json())
    .then((data) => {
      console.log("Request ", i + 1, " finished in ", Date.now() - start, " ms")
      if (i + 1 === RUN_COUNT) {
        console.info(
          "===================ALL REQUESTS WERE FINISHED======================="
        )
      }
    })
}

// "{\"modelId\":\"61c2f27001d71c080fb2ae3f\"}"
