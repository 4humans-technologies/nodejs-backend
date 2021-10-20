module.exports = {
  streamCreated: "new-model-started-stream",

  // on-demand events for global audience
  leaveChannel: "leave-channel",

  // just so that user can not create ant rooms by himself
  // this events use is to update current viewer numbers
  viewerJoined: "viewer-joined",
  viewerLeft: "viewer-left",

  // create or delete room, provided room name/id
  // will basically use these for models to create rooms
  createStreamRoom: "create-stream-room",
  deleteStreamRoom: "delete-stream-room",

  // model accepting/declining calls events
  // naming is not correct these are not for call but
  // for the call requests
  modelAcceptedVideoCallRequest: "model-accepted-video-call",
  modelAcceptedAudioCallRequest: "model-accepted-audio-call",
  modelDeclinedVideoCallRequest: "model-declined-video-call",
  modelDeclinedAudioCallRequest: "model-declined-audio-call",

  // money transfer events
  addedMoneyToWallet: "add-mony-wallet",

  // model/viewer calling
  modelAudioCalling: "model-audio-calling",
  modelVideoCalling: "model-video-calling",
  modelCancelVideoCalling: "model-cancel-video-calling",
  modelCancelAudioCalling: "model-cancel-audio-calling",
  viewerAcceptedAudioCalling: "viewer-accepted-audio-calling",
  viewerAcceptedVideoCalling: "viewer-accepted-video-calling",
  viewerAcceptedCall: "viewer-accepted-call",

  //
  callHasStarted: "call-has-started",
  callHasEnded: "call-has-ended",

  // notifying model that the disconnected viewer has joined again
  // u can have can now
  canAudiCallUsersConnectedAgain: "cacuca",
  canVideoCallUsersConnectedAgain: "cvcuca",

  // on-stream activities
  requestedVideoCall: "requested-video-call",
  requestedAudiCall: "requested-audio-call",
  giftGivenInStream: "gift-given-in-stream",
  inComingAudioCall: "incoming-audio-call",
  inComingVideoCall: "incoming-video-call",
}
