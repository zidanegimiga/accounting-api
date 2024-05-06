const mongoose = require('mongoose');
const conn = require('../utils/queueingDb').getConnection();

const smsNotificationSchema = new mongoose.Schema({
  type: Number,
  gateway: Number,
  from: String,
  to: String,
  status: Number,
  sender_id: {
    type: String,
    enum: [process.env.SENDER_ID_DYNAMIC, process.env.SENDER_ID_EXECUTIVE, process.env.SENDER_ID_FREELANCER],
  },
  reference_id: String,
  collection_name: String,
  options: Object,
  subject: String,
  body: String,
  message: String,
  date_to_release: Date,
  error_msg: String,
  date_created: {
    type: Date,
    default: Date.now,
  },
  date_updated: {
    type: Date,
    default: Date.now,
  },
});

const DataSyncing = conn.model('SMS_Notification', smsNotificationSchema);
module.exports = DataSyncing;
