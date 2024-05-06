const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  text: String,
  tags: { type: Array },
  timestamp: { type: Date, index: true, default: Date.now, expires: '4d' },
});

module.exports = mongoose.model('Logs', logSchema);
