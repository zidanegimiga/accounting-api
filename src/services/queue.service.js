const config = require('../config/config');

const { queue_type, gateway, queue_status } = require('../constants/queue.constant');
const FreelancerNotification = require('../models/smsNotification.model');

const employeeService = require('./employee.service');

// if (['development'].includes(config.env)) {
// }

/**
 * send sms for queueing
 * @param {String} number
 * @param {String} message
 * @param {Boolean} isSme
 * @param {String} referenceId
 * @param {String} collectionName
 * @param {date} dateToRelease
 * @returns {void}
 */
const addSmstoQueue = async (
  number,
  message,
  isSme = false,
  referenceId = '',
  senderId = '',
  collectionName = '',
  dateToRelease = new Date()
) => {
  const freelancerNotification = ['development', 'staging'].includes(config.env)
    ? FreelancerNotificationTest
    : FreelancerNotification;
  if (!isSme) {
    await freelancerNotification.create({
      type: queue_type.sms,
      gateway: gateway.nathan,
      to: number,
      status: queue_status.pending,
      reference_id: referenceId,
      sender_id: senderId,
      collection_name: collectionName,
      message,
      date_to_release: dateToRelease,
      date_created: new Date(),
    });
  } else {
    // await JaneNotification.create({
    //   type: queueTypes.sms,
    //   gateway: gateway.sme,
    //   to: number,
    //   status: queueStatus.pending,
    //   reference_id: referenceId,
    //   collection_name: collectionName,
    //   message,
    //   date_to_release: dateToRelease,
    //   date_created: new Date(),
    // });
  }
};

/**
 * send Email for queueing. this is still in development. queueing service doesnt send emails yet.
 * @param {String} toEmail
 * @param {String} subject
 * @param {Boolean} body
 * @param {String} referenceId
 * @param {date} dateToRelease
 * @returns {void}
 */
const addEmailToQueue = async (toEmail, subject, body, dateToRelease = new Date()) => {
  await FreelancerNotification.create({
    type: queue_type.email,
    to: toEmail,
    status: queue_status.pending,
    subject,
    body,
    date_to_release: dateToRelease,
    date_created: new Date(),
  });
};

module.exports = {
  addSmstoQueue,
  addEmailToQueue,
};
