/* eslint-disable no-param-reassign */
const nodemailer = require('nodemailer');

const AWS = require('aws-sdk');
const config = require('../config/config');
const logger = require('../config/logger');

// const {clientService} = require("./index");

const ses = new AWS.SES({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region,
});

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'production') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email to any receiver
 * @param {string} toEmail
 * @param {string} subject
 * @param {string} body
 * @returns {Promise}
 */

const sendEmail = async (toEmail, subject, body) => {
  const msg = { from: config.email.from, to: toEmail, subject, body, html: body };
  if (['development', 'staging'].includes(config.env)) {
    await transport.sendMail(msg);
  } else {
    let emails = [];

    if (typeof toEmail === 'string') {
      emails.push(toEmail);
    } else emails = toEmail.filter((a) => a !== '');

    const params = {
      Destination: {
        ToAddresses: emails,
      },
      Message: {
        Body: {
          Html: {
            Data: body,
            Charset: 'UTF-8',
          },
          Text: {
            Data: subject,
            Charset: 'UTF-8',
          },
        },
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
      },
      Source: config.email.from,
    };

    ses.sendEmail(params, function (err) {
      if (err) {
        logger.warn(err);
        throw err;
      }
    });
  }
};

const sendEmailWithAttachment = async (from, send_to,ccEmails,subject,body,attachments) => {
  let source ="accounting@nathanhr.com"
  if (['development', 'staging'].includes(config.env)) {
    const msg = {
      from: from,
      to: send_to,
      cc: ccEmails,
      envelope: {
        from: source,
        to: send_to,
      },
      subject,
      body,
      html: body,
      attachments
    };
    await transport.sendMail(msg);
  } else {
    const mailContent = mimemessage.factory({ contentType: 'multipart/mixed', body: [] });

    mailContent.header('From', from);
    mailContent.header('To', send_to);
    mailContent.header('Subject', subject);

    const alternateEntity = mimemessage.factory({
      contentType: 'multipart/alternate',
      body: [],
    });

    const htmlEntity = mimemessage.factory({
      contentType: 'text/html;charset=utf-8',
      body,
    });

    alternateEntity.body.push(htmlEntity);
    mailContent.body.push(alternateEntity);

    const attachmentEntity = mimemessage.factory({
      contentType: 'application/pdf',
      contentTransferEncoding: 'base64',
      body: buffer.toString('base64').replace(/([^**\0**]{76})/g, '$1\n'),
    });

    attachmentEntity.header('Content-Disposition', 'attachment ;filename="Invoice.pdf"');

    mailContent.body.push(attachmentEntity);

    ses.sendRawEmail(
      {
        RawMessage: { Data: mailContent.toString() },
      },
      (err, sesdata, res) => {
        if (err) {
          logger.warn(err);
          throw err;
        }
        if (res) {
          logger.warn(err);
          throw err;
        }
      }
    );
  }
};


// /**
//  * Send reset password email
//  * @param {string} to
//  * @param {string} token
//  * @returns {Promise}
//  */
const sendResetPasswordEmail = async (to, token) => {
  // const user = await clientService.getClientByEmail(to);

  const subject = 'Password Recovery Email';
  const resetPasswordUrl = `${config.clientUrl}/forgot-password?q=${token}`;

  const text = `Hi, <br/>Looks like you've forgotten your password! If so, click the link below to create a new password:<br/>
  <a href='${resetPasswordUrl}'>Reset your Password</a> <br/> If you didn't request this, please ignore this email. <br/><br/>Thanks, Team <br/><br/>`;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} otp
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, otp) => {
  const subject = 'OTP Verification';
  // replace this url with the link to the email verification page of your front-end app
  const text = `Hello,<br/><br/>Your OTP is ${otp}. Please use the code to continue your registration.<br/><br/>Kind regards,<br> Team `;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} otp
 * @returns {Promise}
 */
const sendResetPasswordOTPEmail = async (to, otp) => {
  const subject = 'OTP Verification';
  // replace this url with the link to the email verification page of your front-end app
  const text = `Hello,<br/><br/>Your OTP is ${otp}. Please use the code to continue your reset password.<br/><br/>Kind regards,<br> Team `;
  await sendEmail(to, subject, text);
};

/**
 * Send invoice  email
 * @param {string} to
 * @param {string} otp
 * @returns {Promise}
 */
const sentInvoiceEmail = async (from, send_to,cc,Subject,emailTemplate,path) => {
  const parts = path.split("/");
  const fileKey = parts[parts.length - 1];
  const s3 = new AWS.S3({
    accessKeyId: process.env.SECRET_ID_AWS,
    secretAccessKey: process.env.SECRET_KEY_AWS,
  });
  const params = {
    Bucket: process.env.BUCKET_NAME + '/invoice',
    Key: fileKey,
  };
  const fileData = await s3.getObject(params).promise();


  const attachments = [
    {
      content: Buffer.from(fileData.Body),
      filename: 'invoice.pdf',
    },
  ];

  await sendEmailWithAttachment(from, send_to,cc,Subject,emailTemplate, attachments);
};

 

module.exports = {
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendResetPasswordOTPEmail,
  sendEmail,
  sentInvoiceEmail
};
