const axios = require('axios');
const constants = require('../constants/queue.constant');

const freelancerNotificationModel = require('../models/smsNotification.model');

const sms = async (data = {
  num,
  message,
  sender_id,
  reference_id: '',
  collection_name: '',
  dateToRelease:  new Date(),
}) => {
    console.log('passing sms');
    const sms = new freelancerNotificationModel({
        type: constants.queue_type.sms,
        gateway: constants.gateway.nathan,
        sender_id: data.sender_id,
        to: data.num,
        status: constants.queue_status.pending,
        reference_id: data.reference_id,
        collection_name: data.collection_name,
        message: data.message,
        date_to_release: data.dateToRelease,
        date_created: new Date()
    });
    sms.save();
}

module.exports = sms;
