module.exports = {
  viewer_request_to_have_private_listeners:
    "viewer-request-to-have-private-listeners",
  viewer_private_message_emitted: "viewer-private-message-emitted",
  viewer_private_message_received: "viewer-private-message-received",
  model_private_message_emitted: "model-private-message-emitted",
  model_private_message_received: "model-private-message-received",
  /*  */
  viewer_message_public_emitted: "viewer-message-public-emitted",
  viewer_message_public_received: "viewer-message-public-received",
  model_message_public_emitted: "model-message-public-emitted",
  model_message_public_received: "model-message-public-received",
  viewer_super_message_public_emitted: "viewer_super_message_pubic-emitted",
  viewer_super_message_public_received: "viewer_super_message_pubic-received",
  viewer_left_stream_emitted: "viewer_left_stream_emitted",
  viewer_left_stream_received: "viewer_left_stream_received",
  /* events for users to call to, to do an action ex-report pending calls, update client data */
  user_request_perform_action: "user_request_perform_action",
  requested_action_result_received: "requested-action-result-received",
  /*  */
  got_notification_for_user: "got_notification_for_user",
  send_notification_to_user: "send-notification-to-user",
  // viewer_gifted_token_emitted: "viewer-gifted-token-emitted",
  // viewer_gifted_token_received: "viewer-gifted-token-received"
  /* call */
  model_call_request_response_emitted:
    "model-call-request-response-emitted" /* fire with relatedUserId */,
  model_call_request_response_received:
    "model-call-request-response-received" /* fire with relatedUserId */,
  viewer_requested_for_call_emitted:
    "viewer-requested-for-call-emitted" /* fire with relatedUserId */,
  viewer_requested_for_call_received:
    "viewer-requested-for-call-received" /* fire with relatedUserId */,
  // kick_out_other_request: "kick-out-other-request"mode

  /* call events */
  model_call_end_request_finished: "model-call-end-request-finished",
  model_call_end_request_init_emitted: "model-call-end-request-init-emitted",
  model_call_end_request_init_received: "model-call-end-request-init-received",
  viewer_call_end_request_finished: "viewer-call-end-request-finished",
  viewer_call_end_request_init_emitted: "viewer-call-end-request-init-emitted",
  viewer_call_end_request_init_received:
    "viewer-call-end-request-init-received",
}

module.exports.userActionTypes = {
  user_update_client_data: "user-update-client-data",
  user_reporting_pending_calls: "user_reporting",
}
