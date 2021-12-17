const AudioCall = require("../../../models/globals/audioCall")
const VideoCall = require("../../../models/globals/videoCall")
const Wallet = require("../../../models/globals/wallet")
const Model = require("../../../models/userTypes/Model")
const Viewer = require("../../../models/userTypes/Viewer")
const chatEvents = require("../chat/chatEvents")
const io = require("../../../socket")

module.exports = function (client) {
  /* if anyone viewer or model leaves the call also means model has is not live she's offline */
  /* for updating the number in the header */

  if (client.userType === "Model") {
    /* ==== disconnection from model side ==== */
    const callId = client.callId
    const callType = client.callType
    const endTimeStamp = Date.now()

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
          return Promise.reject("Viewer ended/disconnected before you.")
        } else if (result.n === 1) {
          /* you have locked the db model cannot over-write */
          io.getIO().emit(
            chatEvents.call_end,
            io.decreaseLiveCount(client.data.relatedUserId)
          )
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

        /* 🚩🚩🚩🚩🚩====ERROR====🚩🚩🚩🚩🚩🚩 */
        if (theCall.status !== "ongoing") {
          /* means the call was not setup properly*/
          /* now refund the money of the user */
          theCall.status = "completed-and-billed"
          theCall.endReason = "viewer-&-model-network-error"
          const amountToRefund = theCall.minCallDuration * theCall.chargePerMin
          const amtToDeductFromModel =
            amountToRefund * (theCall.sharePercent / 100)
          console.error(
            "A call was not setup properly, hence refunding amt: ",
            amountToRefund
          )
          Promise.all([
            theCall.save(),
            Wallet.updateOne(
              {
                relatedUser: theCall.viewer._id,
              },
              {
                $inc: { currentAmount: amountToRefund },
              }
            ),
            Wallet.updateOne(
              {
                relatedUser: theCall.model._id,
              },
              {
                $inc: { currentAmount: -amtToDeductFromModel },
              }
            ),
            Viewer.updateOne(
              {
                _id: theCall.viewer._id,
              },
              {
                $pull:
                  callType === "audioCall"
                    ? { "pendingCalls.audioCalls": theCall._id }
                    : { "pendingCalls.videoCalls": theCall._id },
              }
            ),
            Model.updateOne(
              {
                _id: theCall.model._id,
              },
              {
                $pull:
                  callType === "audioCall"
                    ? { "pendingCalls.audioCalls": theCall._id }
                    : { "pendingCalls.videoCalls": theCall._id },
                onCall: false,
                isStreaming: false,
                currentStream: null,
              }
            ),
          ])
            .then((result) => {
              io.getIO()
                .in(`${theCall.model._id}-private`)
                .emit("model-wallet-updated", {
                  modelId: theCall.model._id,
                  operation: "dec",
                  amount: amtToDeductFromModel,
                })

              io.getIO()
                .in(`${theCall.viewer._id}-private`)
                .emit(chatEvents.model_call_end_request_finished, {
                  theCall: theCall._doc,
                  amountToRefund: amountToRefund,
                  message:
                    "Call was not connected properly hence your money is refunded",
                  ended: "not-setuped-properly",
                })

              if (!result[1].n + result[2].n + result[3].n + result[4].n != 4) {
                console.error(
                  "All documents were not updated, while ending call"
                )
              }
            })
            .catch((err) =>
              console.error(
                "Call was not setup properly & also ot disconnected properly :Reason : ",
                err.message
              )
            )
          /* break out of the below promise chain */
          return Promise.reject("The call was not ongoing")
        }

        if (theCall.endTimeStamp) {
          /* return bro */
          throw new Error(
            "call doc updated even after locking, There was endTimestamp already"
          )
        } else {
          /* do the money transfer logic */
          theCall.endTimeStamp = endTimeStamp
          theCall.endReason = "model-network-error"
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
      .then(() => {
        /* now remove the pending calls from model & viewer */
        const viewerPr = Viewer.updateOne(
          {
            _id: theCall.viewer._id,
          },
          {
            $addToSet:
              callType === "audioCall"
                ? { audioCallHistory: theCall._id }
                : { videoCallHistory: theCall._id },
            $pull:
              callType === "audioCall"
                ? { "pendingCalls.audioCalls": theCall._id }
                : { "pendingCalls.videoCalls": theCall._id },
          },
          { runValidators: true }
        )

        const modelPr = Model.updateOne(
          {
            _id: theCall.model._id,
          },
          {
            $pull:
              callType === "audioCall"
                ? { "pendingCalls.audioCalls": theCall._id }
                : { "pendingCalls.videoCalls": theCall._id },
            $addToSet:
              callType === "audioCall"
                ? { audioCallHistory: theCall._id }
                : { videoCallHistory: theCall._id },
          },
          { runValidators: true }
        )
        return Promise.all([viewerPr, modelPr])
      })
      .then(() => {
        io.getIO()
          .in(`${theCall.stream._id.toString()}-public`)
          .emit(chatEvents.model_call_end_request_finished)

        /* not sure if this needs to be done as anyway client is disconnected */
        delete client.onCall
        delete client.callId
        delete client.callType
        delete client.sharePercent
      })
      .catch((err) =>
        console.error(
          `call was not ended successFully for call => ${client.callId}, due to ${err.message}`
        )
      )
  } else if (client.userType === "Viewer") {
    /* ========= DISCONNECTION FROM VIEWER SIDE ======== */

    let theCall
    let viewerWallet
    /* 
     amount to deduct from the models wallet 
     NOTE: this can be zero (0) if the call disconnects before the min call duration
     as we have already deducted the min call duration amount from the viewer
    */
    let amountToDeduct
    let amountAdded /* amount added in the models wallet */
    let modelWallet
    const endTimeStamp = Date.now()
    const initialQuery =
      client.callType === "audioCall"
        ? AudioCall.updateOne(
            {
              _id: client.callId,
            },
            {
              $addToSet: { concurrencyControl: 1 },
            }
          )
        : VideoCall.updateOne(
            {
              _id: client.callId,
            },
            {
              $addToSet: { concurrencyControl: 1 },
            }
          )

    initialQuery
      .then((result) => {
        /* decrease model count */
        if (result.n === 0) {
          /* no doc modified, model has ended tha call faster, return */
          return Promise.reject(
            "Model ended/disconnected before model ended call before you, please wait while we are processing the transaction!"
          )
        } else if (result.n > 0) {
          /* you have locked the db viewer cannot over-write */
          io.getIO().emit(
            chatEvents.call_end,
            io.decreaseLiveCount(client.data.relatedUserId)
          )
          const query =
            client.callType === "audioCall"
              ? Promise.all([
                  AudioCall.findById(client.callId),
                  Wallet.findOne({ relatedUser: client.data.relatedUserId }),
                ])
              : Promise.all([
                  VideoCall.findById(client.callId),
                  Wallet.findOne({ relatedUser: client.data.relatedUserId }),
                ])
          return query
        }
      })
      .then((values) => {
        theCall = values[0]
        viewerWallet = values[1]
        if (theCall.endTimeStamp) {
          /* return bro */
          const error = new Error(
            "call doc updated even after locking, this should be impossible"
          )
          error.statusCode = 500
          throw error
        } else {
          /* do the money transfer logic */
          theCall.endTimeStamp = endTimeStamp
          theCall.endReason = "viewer-network-error"
          theCall.callDuration = (+endTimeStamp - theCall.startTimeStamp) / 1000
          const totalCallDuration =
            (+endTimeStamp - theCall.startTimeStamp) /
            60000 /* convert milliseconds to minutes */

          if (totalCallDuration <= theCall.minCallDuration) {
            amountToDeduct = 0
          } else {
            const billableCallDuration = Math.ceil(
              totalCallDuration - theCall.minCallDuration
            ) /* in minutes */
            amountToDeduct = billableCallDuration * theCall.chargePerMin
          }
          viewerWallet.deductAmount(amountToDeduct)

          return Promise.all([
            viewerWallet.save(),
            theCall.save(),
            Model.findByIdAndUpdate(theCall.model._id, {
              onCall: false,
              isStreaming: false,
            })
              .select("sharePercent")
              .lean(),
            Wallet.findOne({ relatedUser: theCall.model._id }),
          ])
        }
      })
      .then((values) => {
        const sharePercent = values[2].sharePercent
        modelWallet = values[3]
        /* assign the latest values to theCall */
        theCall = values[1]
        amountAdded = amountToDeduct * (sharePercent / 100)
        modelWallet.addAmount(amountAdded)
        /* for admin account */
        // adminWallet.addAmount(amountToDeduct * ((100 - sharePercent) / 100))
        return modelWallet.save()
      })
      .then(() => {
        /* now remove the pending calls from model & viewer */
        const viewerPr = Viewer.updateOne(
          {
            _id: theCall.viewer._id,
          },
          {
            $addToSet:
              client.callType === "audioCall"
                ? { audioCallHistory: theCall._id }
                : { videoCallHistory: theCall._id },
            $pull:
              client.callType === "audioCall"
                ? { "pendingCalls.audioCalls": theCall._id }
                : { "pendingCalls.videoCalls": theCall._id },
          },
          { runValidators: true }
        )

        const modelPr = Model.updateOne(
          {
            _id: theCall.model._id,
          },
          {
            $pull:
              client.callType === "audioCall"
                ? { "pendingCalls.audioCalls": theCall._id }
                : { "pendingCalls.videoCalls": theCall._id },
            $addToSet:
              client.callType === "audioCall"
                ? { audioCallHistory: theCall._id }
                : { videoCallHistory: theCall._id },
          },
          { runValidators: true }
        )
        return Promise.all([viewerPr, modelPr])
      })
      .then((values) => {
        if (values[1].n + values[0].n === 2) {
          let modelSocketCleared = false /* model socket */
          try {
            /* try to clear models socket client also */ a
            const modelSocket = io
              .getIO()
              .sockets.sockets.get(
                Array.from(
                  io
                    .getIO()
                    .sockets.adapter.rooms.get(
                      `${theCall.model._id.toString()}-private`
                    )
                )?.[0]
              )
            delete modelSocket.onCall
            delete modelSocket.callId
            delete modelSocket.callType
            delete modelSocket.sharePercent
            modelSocketCleared = true
          } catch (e) {
            modelSocketCleared = false
          }

          /* update models local wallet  */
          io.getIO()
            .in(`${theCall.model._id.toString()}-private`)
            .emit("model-wallet-updated", {
              modelId: theCall.model._id,
              operation: "add",
              amount: amountAdded,
            })

          /* not have to show call end details of the  model, model already have viewers detail */
          io.getIO()
            .in(`${theCall.stream._id.toString()}-public`)
            .emit(chatEvents.viewer_call_end_request_finished, {
              theCall: theCall._doc,
              modelGot: amountAdded,
              totalCharges: amountToDeduct,
              message: "Call was ended successfully by the model",
              ended: "ok",
              modelSocketCleared: modelSocketCleared,
            })

          /**
           * as client has disconnected no need to clear socket
           */
        } else {
          const error = new Error("pending calls were not removed successfully")
          error.statusCode = 500
          throw error
        }
      })
      .catch((err) => {
        console.error(
          "Error while ending call after viewer disconnection Reason: ",
          err?.message || err
        )
      })

    /**
     * 1. remove this call from pending calls of viewer & model
     * 2. bill & debit the amount respectively
     * 3. write meta data to the call record and close
     * 4. change model status
     * 5. destroy chat channels
     */
  }
}
