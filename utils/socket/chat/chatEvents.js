module.exports = {
  viewer_request_to_have_private_listeners: "viewer-request-to-have-private-listeners",
  viewer_message_private_emitted: "viewer-message-private-emitted",
  viewer_message_private_received: "viewer-message-private-received",
  viewer_message_public_emitted: "viewer-message-public-emitted",
  viewer_message_public_received: "viewer-message-public-received",
  model_message_private_emitted: "model-message-private-emitted",
  model_message_private_received: "model-message-private-received",
  model_message_public_emitted: "model-message-public-emitted",
  model_message_public_received: "model-message-public-received",
  viewer_super_message_public_emitted: "viewer_super_message_pubic-emitted",
  viewer_super_message_public_received: "viewer_super_message_pubic-received",
  viewer_call_requested_emitted: "viewer_call_requested-emitted",
  viewer_call_requested_received: "viewer_call_requested-received",
  viewer_call_request_declined: "viewer_call_requested",
  viewer_left_stream_emitted: "viewer_left_stream_emitted",
  viewer_left_stream_received: "viewer_left_stream_received",
  /* events for users to call to, to do an action ex-report pending calls, update client data */
  user_request_perform_action: "user_request_perform_action",
  requested_action_result_received: "requested-action-result-received",
  /*  */
  got_notification_for_user: "got_notification_for_user",
  send_notification_to_user: "send-notification-to-user",
  /*  */
  // viewer_gifted_token_emitted: "viewer-gifted-token-emitted",
  // viewer_gifted_token_received: "viewer-gifted-token-received"
}

module.exports.userActionTypes = {
  user_update_client_data: "user-update-client-data",
  user_reporting_pending_calls: "user_reporting",
}
