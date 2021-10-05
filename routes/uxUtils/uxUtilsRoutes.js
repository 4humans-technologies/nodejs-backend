const router = require("express").Router();
const uxUtils = require("../../controllers/uxUtils.js/uxUtils");

router.get("/get-streaming-models", uxUtils.getStreamingModels);
router.get("/get-live-streams", uxUtils.getLiveStreams);
router.get("/get-ranking-online-models", uxUtils.getRankingOnlineModels);

module.exports = router;
