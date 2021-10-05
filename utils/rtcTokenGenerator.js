const { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole } = require("agora-access-token")

module.exports = (userType, userTypeId, channel, validity = 1) => {
  console.log(">>>", userType);
  const privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600 * validity;
  let rtcToken;
  if (userType === "viewer" || userType === "unAuthed") {
    const role = RtcRole.SUBSCRIBER;
    rtcToken = RtcTokenBuilder.buildTokenWithUid(
      process.env.APP_ID,
      process.env.APP_CERT,
      channel,
      userTypeId,
      role,
      privilegeExpiredTs
    );
  } else if (userType === "model") {
    const role = RtcRole.PUBLISHER;
    rtcToken = RtcTokenBuilder.buildTokenWithUid(
      process.env.APP_ID,
      process.env.APP_CERT,
      channel,
      userTypeId,
      role,
      privilegeExpiredTs
    );
  }

  return {
    privilegeExpiredTs: privilegeExpiredTs,
    rtcToken: rtcToken,
  };
};

