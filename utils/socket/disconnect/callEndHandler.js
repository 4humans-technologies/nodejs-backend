const AudioCall = require("../../../models/globals/audioCall")
const VideoCall = require("../../../models/globals/videoCall")
const Wallet = require("../../../models/globals/wallet")
const Model = require("../../../models/userTypes/Model")
const Viewer = require("../../../models/userTypes/Viewer")
const chatEvents = require("../chat/chatEvents")
const io = require("../../../socket")

module.exports = function (client) {
  if (client.userType === "Model") {
    const callId = client.callId
    const callType = client.callType
    const endTimeStamp = Date.now()

    /*  */
    let theCall
    let modelWallet
    let amountToDeduct
    let amountAdded
    let viewerWallet

    const initialQuery =
      callType === "audioCall"
        ? AudioCall.updateOne(
            {
              _id: callId,
            },
            {
              $addToSet: { concurrencyControl: 1 },
            }
          )
        : VideoCall.updateOne(
            {
              _id: callId,
            },
            {
              $addToSet: { concurrencyControl: 1 },
            }
          )

    initialQuery
      .then((result) => {
        if (result.n === 0) {
          /* no doc modified, model has disconnected from call faster, return */
          return Promise.reject("Call ended already")
        } else if (result.n > 0) {
          /* you have locked the db model cannot over-rite */
          const query =
            callType === "audioCall"
              ? Promise.all([
                  AudioCall.findById(callId),
                  Wallet.findOne({
                    relatedUser: client.data.relatedUserId,
                  }),
                ])
              : Promise.all([
                  VideoCall.findById(callId),
                  Wallet.findOne({
                    relatedUser: client.data.relatedUserId,
                  }),
                ])
          return query
        }
      })
      .then((values) => {
        theCall = values[0]
        modelWallet = values[1]
        if (theCall.endTimeStamp) {
          /* return bro */
          throw new Error(
            "call doc updated even after locking, this should be impossible"
          )
        } else {
          /* do the money transfer logic */
          theCall.endTimeStamp = endTimeStamp
          const totalCallDuration =
            (endTimeStamp - theCall.startTimeStamp) /
            60000 /* convert milliseconds to seconds */
          if (totalCallDuration <= theCall.minCallDuration) {
            amountToDeduct = 0
          } else {
            const billableCallDuration = Math.ceil(
              totalCallDuration - theCall.minCallDuration
            ) /* in minutes */
            amountToDeduct = billableCallDuration * theCall.chargePerMin
          }
          amountAdded = amountToDeduct * (client.sharePercent / 100)
          modelWallet.addAmount(amountAdded)
          /* for admin account */
          // adminWallet.addAmount(amountToDeduct * ((100 - sharePercent) / 100))
          return Promise.all([
            modelWallet.save(),
            theCall.save(),
            Wallet.findOne({ relatedUser: theCall.viewer._id }),
          ])
        }
      })
      .then((values) => {
        /* assign the latest values to theCall */
        theCall = values[1]
        viewerWallet = values[2]
        viewerWallet.deductAmount(amountToDeduct)
        return viewerWallet.save()
      })
      .then((wallet) => {
        /* now remove the pending calls from model & viewer */
        const viewerPr = Viewer.updateOne(
          {
            _id: theCall.viewer._id,
          },
          {
            pendingCall: null,
          }
        )
        let modelPr

        if (callType === "audioCall") {
          modelPr = Model.updateOne(
            {
              _id: theCall.model._id,
            },
            {
              $pull: {
                "pendingCalls.audioCalls": theCall._id,
              },
              onCall: false,
            },
            { runValidators: true }
          )
        } else {
          modelPr = Model.updateOne(
            {
              _id: theCall.model._id,
            },
            {
              $pull: { "pendingCalls.videoCalls": theCall._id },
              onCall: false,
            },
            { runValidators: true }
          )
        }

        return Promise.all([viewerPr, modelPr])
      })
      .then((values) => {
        io.getIO()
          .in(`${theCall.stream._id.toString()}-public`)
          .emit(chatEvents.model_call_end_request_finished)

        delete client.onCall
        delete client.callId
        delete client.callType
        delete client.sharePercent
      })
      .catch((err) =>
        console.log(
          `call was not ended successFully for call => ${client.callId}, due to ${err.message}`
        )
      )
  } else if (client.userType === "Viewer") {
    /*  */
  }
}
