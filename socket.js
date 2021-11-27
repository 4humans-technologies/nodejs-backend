let io
let liveModelCount = 0
module.exports = {
  init: (serverInstance, options = null) => {
    io = require("socket.io")(serverInstance, options)
    return io
  },
  getIO: () => {
    if (!io) {
      throw new Error("socket.io is not initialized!")
    }
    return io
  },
  increaseLiveCount: () => {
    return ++liveModelCount
  },
  decreaseLiveCount: () => {
    return --liveModelCount
  },
  setLiveCount: (newCount) => {
    liveModelCount = newCount
  },
  getLiveCount: () => {
    return liveModelCount
  },
}
