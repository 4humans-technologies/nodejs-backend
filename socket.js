let io
/**
 * the concept is don't decrement the count numerically, instead
 * maintain an array of _id's of live models and pop the model
 * _id and return the new length of the array, hence no model
 * can be pulled two times and -ve count problem will be solved
 */
let liveModels = []
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

  increaseLiveCount: (model) => {
    /**
     * model = {
     *  _id:id,
     *  username:str
     * }
     */
    console.log(`Model ${model.username} is live now`)
    if (!liveModels.find((entry) => entry._id === model._id)) {
      /**
       * only push unique models
       */
      liveModels.push(model)
    }
    return liveModels.length
  },
  decreaseLiveCount: (modelId) => {
    /**
     * modelId should be string
     */
    liveModels = liveModels.filter((model) => {
      if (model._id !== modelId) {
        console.log(`Model @${model.username} is now offline ::>`)
      }
      return model._id !== modelId
    })
    return liveModels.length
  },
  getLiveCount: () => {
    return liveModels.length
  },
}
