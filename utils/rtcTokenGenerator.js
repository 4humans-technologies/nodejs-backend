const { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole } = require("agora-access-token")

module.exports = (userType, userTypeId, channel, validity = process.env.AGORA_TOKEN_VALADITY_HOURS) => {
    if (userType === "viewer" || userType === "unAuthed") {
        const role = RtcRole.SUBSCRIBER
        const privilegeExpiredTs = Math.floor(Date.now() / 1000) + (3600 * validity)
        const rtcToken = RtcTokenBuilder.buildTokenWithUid(process.env.APP_ID, process.env.APP_CERT, channel, userTypeId, role, privilegeExpiredTs)
    } else if (userType === "model") {
        const role = RtcRole.PUBLISHER
        const privilegeExpiredTs = Math.floor(Date.now() / 1000) + (3600 * validity)
        const rtcToken = RtcTokenBuilder.buildTokenWithUid(process.env.APP_ID, process.env.APP_CERT, channel, userTypeId, role, privilegeExpiredTs)
    }

    return {
        privilegeExpiredTs:privilegeExpiredTs,
        rtcToken:rtcToken
    }
}

