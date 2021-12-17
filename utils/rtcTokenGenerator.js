const { RtcTokenBuilder, RtcRole } = require("agora-access-token")

module.exports = (userType, userTypeId, channel, validity, unit = "sec") => {
  let privilegeExpiredTs

  if (validity) {
    if (unit === "hours") {
      privilegeExpiredTs = Math.floor(Date.now() / 1000) + 3600 * validity
    } else if (unit === "min") {
      privilegeExpiredTs = Math.floor(Date.now() / 1000) + 60 * validity
    } else if (unit === "sec") {
      privilegeExpiredTs = Math.floor(Date.now() / 1000) + validity
    } else {
      privilegeExpiredTs = Math.floor(Date.now() / 1000) + validity
    }
  } else {
    privilegeExpiredTs =
      Math.floor(Date.now() / 1000) +
      3600 * +process.env.AGORA_TOKEN_VALADITY_HOURS
  }
  let rtcToken
  if (userType === "viewer" || userType === "unAuthed") {
    const role = RtcRole.SUBSCRIBER
    rtcToken = RtcTokenBuilder.buildTokenWithUid(
      process.env.APP_ID,
      process.env.APP_CERT,
      channel,
      userTypeId,
      role,
      privilegeExpiredTs
    )
  } else if (userType === "model") {
    const role = RtcRole.PUBLISHER
    rtcToken = RtcTokenBuilder.buildTokenWithUid(
      process.env.APP_ID,
      process.env.APP_CERT,
      channel,
      userTypeId,
      role,
      privilegeExpiredTs
    )
  }

  return {
    privilegeExpiredTs: privilegeExpiredTs,
    rtcToken: rtcToken,
  }
}
