const router = require("express").Router()
const uxUtils = require("../../controllers/uxUtils.js/uxUtils")

router.get("/get-streaming-models", uxUtils.getStreamingModels)
router.get("/get-live-streams", uxUtils.getLiveStreams)
router.get("/get-ranking-online-models", uxUtils.getRankingOnlineModels)
router.get("/get-all-models", uxUtils.getAllModels)
router.get("/get-live-models-count", uxUtils.getLiveModelsCount)

module.exports = router
