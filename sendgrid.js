const sgMail = require("@sendgrid/mail")
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

exports.sendTheMail = (msg) => {
  return sgMail
    .send(msg)
    .then(() => {
      console.log(`E-mail sent to ${msg.to} successfully`)
    })
    .catch((error) => {
      console.error(
        `E-mail was not sent to ${msg?.to} reason: ${error?.message}`
      )
    })
}

exports.fromEmails = {
  ADMIN: "admin@dreamgirllive.com",
  DREAMGIRL: "dreamgirllive@dreamgirllive.com",
}

exports.mailTemplates = {
  MODEL_CONFORMATION_TEMPLATE: "d-426e9677d7dd4f08b6920e6380dced72",
  VIEWER_CONFORMATION_TEMPLATE: "d-09b4bcbffdbb42aa821b5584a8dfbba5",
  PASSWORD_RESET: "d-37d6c29ba220441595d33e2a9baa6f09",
}

exports.sendModelEmailConformation = (msgData) => {
  const dataToSend = {
    ...msgData,
    subject: "E-mail verification for dreamgirllive.com",
    from: this.fromEmails.DREAMGIRL,
    templateId: this.mailTemplates.MODEL_CONFORMATION_TEMPLATE,
  }
  return this.sendTheMail(dataToSend)
}

exports.sendViewerEmailConformation = (msgData) => {
  const dataToSend = {
    ...msgData,
    subject:
      "E-mail verification for dreamgirllive.com, please verify your email",
    from: this.fromEmails.DREAMGIRL,
    templateId: this.mailTemplates.VIEWER_CONFORMATION_TEMPLATE,
  }
  return this.sendTheMail(dataToSend)
}

exports.sendPasswordResetLink = (msgData) => {
  const dataToSend = {
    ...msgData,
    subject: "Password reset link for dreamgirllive.com",
    from: this.fromEmails.DREAMGIRL,
    templateId: this.mailTemplates.PASSWORD_RESET,
  }
  return this.sendTheMail(dataToSend)
}

// const msg = {
//   to: "test@example.com", // Change to your recipient
//   from: "test@example.com", // Change to your verified sender
//   subject: "Sending with SendGrid is Fun",
//   text: "and easy to do anywhere, even with Node.js",
//   html: "<strong>and easy to do anywhere, even with Node.js</strong>",
// }
