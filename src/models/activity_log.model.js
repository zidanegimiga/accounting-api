const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: Object,
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    module_info: {
      type: Object,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
    },
    isDeleted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('activity_logs', activityLogSchema);
