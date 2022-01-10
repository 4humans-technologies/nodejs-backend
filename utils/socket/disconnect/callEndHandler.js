const AudioCall = require("../../../models/globals/audioCall")
const VideoCall = require("../../../models/globals/videoCall")
const Wallet = require("../../../models/globals/wallet")
const Model = require("../../../models/userTypes/Model")
const Viewer = require("../../../models/userTypes/Viewer")
const chatEvents = require("../chat/chatEvents")
const io = require("../../../socket")
const CoinsSpendHistory = require("../../../models/globals/coinsSpendHistory")
const coinsUses = require("../../../utils/coinsUseCaseStrings")

module.exports = function (client) {
  /* if anyone viewer or model leaves the call also means model has is not live she's offline */
  /* for updating the number in the header */

  if (client.userType === "Model") {
    /* ==== disconnection from model side ==== */
    const callId = client.callId
    const callType = client.callType
    const endTimeStamp = Date.now()

    /**
     * emit call-request-init-event
     */

    io.getIO()
      .in(`${client.data.relatedUserId}-private`)
      .emit(chatEvents.viewer_call_end_request_init_received, {
        action: "model-has-requested-call-end",
      })

    let theCall
    const query =
      callType === "audioCall"
        ? Promise.all([
            AudioCall.updateOne(
              {
                _id: callId,
              },
              {
                $addToSet: { concurrencyControl: 1 },
              }
            ),
            AudioCall.findById(callId),
          ])
        : Promise.all([
            VideoCall.updateOne(
              {
                _id: callId,
              },
              {
                $addToSet: { concurrencyControl: 1 },
              }
            ),
            VideoCall.findById(callId),
          ])

    query
      .then(([lockResult, callDoc]) => {
        theCall = callDoc
        if (lockResult.nModified !== 1) {
          return Promise.reject(
            "Viewer has ended the call before you, please wait while the transaction is processing!"
          )
        }

        if (theCall.status !== "ongoing") {
          /**
           * It means the call was not setup properly from the viewer side
           * now refund the "advance" amount to the viewer
           */
          theCall.status = "ended"
          theCall.endReason = "viewer-network-error"

          const amountToRefundViewer = theCall.advanceCut
          const deductFromModel =
            amountToRefundViewer * (theCall.sharePercent / 100)

          console.error(
            "A call was not setup properly, hence refunding amt: ",
            amountToRefundViewer,
            " to the viewer"
          )

          return Promise.all([
            false,
            theCall.save(),
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
            amountToRefundViewer,
            deductFromModel,
            Wallet.updateOne(
              {
                relatedUser: theCall.viewer._id,
              },
              {
                $inc: { currentAmount: amountToRefundViewer },
              }
            ),
            Wallet.updateOne(
              {
                relatedUser: theCall.model._id,
              },
              {
                $inc: { currentAmount: -deductFromModel },
              }
            ),
            /* DELETE THE CALL ALSO */
            CoinsSpendHistory({
              tokenAmount: amountToRefundViewer,
              forModel: theCall.model._id,
              by: theCall.viewer._id,
              sharePercent: theCall.sharePercent,
              givenFor: coinsUses.VIEWER_REFUND,
            }).save(),
          ])
        } else {
          /**
           * if call was setup properly
           */
          theCall = callDoc
          theCall.endTimeStamp = endTimeStamp
          theCall.endReason = "model-ended"
          theCall.status = "ended"

          const callDuration =
            (+endTimeStamp - theCall.startTimeStamp) / 1000 /* IN SECONDS */
          const callDurationMinutes = callDuration / 60

          theCall.callDuration = callDuration
          let viewerDeducted
          let modelGot

          if (
            theCall.advanceCut >
            theCall.minCallDuration * theCall.chargePerMin
          ) {
            /**
             * means all the money from the viewer was
             * cut as advance, and the viewer has talked
             * as long as advance money lasted
             */
            viewerDeducted = theCall.advanceCut
            modelGot = theCall.advanceCut * (theCall.sharePercent / 100)
          } else {
            /**
             * viewer had the money for next minute
             */
            if (callDurationMinutes <= theCall.minCallDuration) {
              /* minCall duration charges only, not extra charges */
              viewerDeducted = theCall.minCallDuration * theCall.chargePerMin
              modelGot = viewerDeducted * (theCall.sharePercent / 100)
            } else {
              /* now charge over minCall duration */
              viewerDeducted =
                Math.ceil(callDuration / 60) * theCall.chargePerMin
              modelGot = viewerDeducted * (theCall.sharePercent / 100)
            }
          }

          return Promise.all([
            true,
            theCall.save(),
            Viewer.updateOne(
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
            ),
            Model.updateOne(
              {
                _id: theCall.model,
              },
              {
                isStreaming: false,
                onCall: false,
                currentStream: null,
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
            ),
            viewerDeducted,
            modelGot,
            Wallet.findOne({
              relatedUser: theCall.viewer,
            }).lean(),
            Wallet.findOne({
              relatedUser: client.data.relatedUserId,
            }).lean(),
            CoinsSpendHistory({
              tokenAmount: viewerDeducted,
              forModel: theCall.model._id,
              by: theCall.viewer._id,
              sharePercent: theCall.sharePercent,
              givenFor:
                callType === "audioCall"
                  ? coinsUses.AUDIO_CALL_COMPLETE
                  : coinsUses.VIDEO_CALL_COMPLETE,
            }).save(),
          ])
        }
      })
      .then((result) => {
        if (!result[0]) {
          /**
           * if call was not setup properly
           */
          const [
            callSetUpProperly,
            call,
            viewerRes,
            modelRes,
            amountToRefundViewer,
            deductFromModel,
            vWalletRes,
            mWalletRes,
          ] = result

          theCall = call
          if (viewerRes.n + modelRes.n !== 2) {
            console.error(
              "Model or Viewer ware not updated correctly after the call end from viewer!"
            )
          }
          /**
           * emit to the viewer about call transaction compeletion, with error
           */
          io.getIO()
            .in(`${theCall.viewer._id}-private`)
            .emit(chatEvents.model_call_end_request_finished, {
              theCall: theCall._doc,
              amountToRefund: amountToRefundViewer,
              message:
                "Call was not connected properly hence your money is refunded",
              ended: "not-setuped-properly",
            })
        } else {
          const [
            callSetUpProperly,
            call,
            viewerRes,
            modelRes,
            viewerDeducted,
            modelGot,
            viewerWallet,
            modelWallet,
          ] = result

          theCall = call
          if (viewerRes.n + modelRes.n !== 2) {
            console.error(
              "Model or Viewer ware not updated correctly after the call end from viewer!"
            )
          }

          /**
           * emit to the viewer about call transaction completion
           */

          io.getIO()
            .in(`${theCall.viewer.toString()}-private`)
            .emit(chatEvents.model_call_end_request_finished, {
              theCall: theCall._doc,
              modelGot: modelGot,
              totalCharges: viewerDeducted,
              message: "Call was ended successfully by the model",
              ended: "ok",
              currentAmount: viewerWallet.currentAmount,
            })
        }
      })
      .finally(() => {
        /**
         * destroy the public channel
         */
        io.getIO()
          .in(`${theCall.stream._id.toString()}-public`)
          .socketsLeave(`${theCall.stream._id.toString()}-public`)

        /**
         * remove this model from live models list
         */
        io.getIO().emit(
          chatEvents.call_end,
          io.decreaseLiveCount(client.data.relatedUserId)
        )
      })
  } else if (client.userType === "Viewer") {
    /* ========= DISCONNECTION FROM VIEWER SIDE ======== */
    const callId = client.callId
    const callType = client.callType
    const endTimeStamp = Date.now()

    io.getIO()
      .in(`${client.data.relatedUserId}-private`)
      .emit(chatEvents.model_call_end_request_init_received, {
        action: "model-has-requested-call-end",
      })

    let theCall
    const query =
      callType === "audioCall"
        ? Promise.all([
            AudioCall.updateOne(
              {
                _id: callId,
              },
              {
                $addToSet: { concurrencyControl: 1 },
              }
            ),
            AudioCall.findById(callId),
          ])
        : Promise.all([
            VideoCall.updateOne(
              {
                _id: callId,
              },
              {
                $addToSet: { concurrencyControl: 1 },
              }
            ),
            VideoCall.findById(callId),
          ])

    query
      .then(([lockResult, callDoc]) => {
        theCall = callDoc
        if (lockResult.nModified !== 1) {
          /**
           * processing of transaction for this call is already done
           */
          return Promise.reject(
            "Model has ended the call before you, please wait while the transaction is processing!"
          )
        }
        theCall.endTimeStamp = endTimeStamp
        theCall.endReason = "viewer-ended"
        theCall.status = "ended"

        const callDuration =
          (+endTimeStamp - theCall.startTimeStamp) / 1000 /* IN SECONDS */
        const callDurationMinutes = callDuration / 60

        theCall.callDuration = callDuration

        let viewerDeducted
        let modelGot
        if (
          theCall.advanceCut >
          theCall.minCallDuration * theCall.chargePerMin
        ) {
          /**
           * means all the money from the viewer was
           * cut as advance, and the viewer has talked
           * as long as advance money lasted
           */
          viewerDeducted = theCall.advanceCut
          modelGot = theCall.advanceCut * (theCall.sharePercent / 100)
        } else {
          /**
           * viewer had the money for next minute
           */
          if (callDurationMinutes <= theCall.minCallDuration) {
            /* minCall duration charges only, not extra charges */
            viewerDeducted = theCall.minCallDuration * theCall.chargePerMin
            modelGot = viewerDeducted * (theCall.sharePercent / 100)
          } else {
            /* now charge over minCall duration */
            viewerDeducted = Math.ceil(callDuration / 60) * theCall.chargePerMin
            modelGot = viewerDeducted * (theCall.sharePercent / 100)
          }
        }

        return Promise.all([
          theCall.save(),
          Model.updateOne(
            {
              _id: theCall.model,
            },
            {
              isStreaming: false,
              onCall: false,
              currentStream: null,
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
          ),
          Viewer.updateOne(
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
          ),
          viewerDeducted,
          modelGot,
          Wallet.findOne({
            relatedUser: theCall.viewer,
          }).lean(),
          Wallet.findOne({
            relatedUser: theCall.model,
          }).lean(),
          CoinsSpendHistory({
            tokenAmount: viewerDeducted,
            forModel: theCall.model._id,
            by: theCall.viewer._id,
            sharePercent: theCall.sharePercent,
            givenFor:
              callType === "audioCall"
                ? coinsUses.AUDIO_CALL_COMPLETE
                : coinsUses.VIDEO_CALL_COMPLETE,
          }).save(),
        ])
      })
      .then(
        ([
          call,
          modelRes,
          viewerRes,
          viewerDeducted,
          modelGot,
          viewerWallet,
          modelWallet,
        ]) => {
          if (viewerRes.n + modelRes.n !== 2) {
            console.error(
              "Model or Viewer ware not updated correctly after the call end from viewer!"
            )
          }
          /**
           * emit to the model about call transaction completion
           */
          io.getIO()
            .in(`${theCall.model.toString()}-private`)
            .emit(chatEvents.viewer_call_end_request_finished, {
              theCall: theCall._doc,
              modelGot: modelGot,
              totalCharges: viewerDeducted,
              message: "Call was ended successfully by the model",
              ended: "ok",
              currentAmount: modelWallet.currentAmount,
            })
        }
      )
      .catch((err) => {
        if (typeof err === "string") {
          console.error(err)
        } else {
          console.error("Viewer disconnected from call Error: " + err.message)
        }
      })
      .finally(() => {
        /**
         * destroy the public channel
         */
        io.getIO()
          .in(`${theCall.stream.toString()}-public`)
          .socketsLeave(`${theCall.stream.toString()}-public`)

        /**
         * this model from live models list
         */
        io.getIO().emit(
          chatEvents.call_end,
          io.decreaseLiveCount(theCall.model._id.toString())
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
