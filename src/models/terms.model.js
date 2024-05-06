const mongoose = require('mongoose');

const termsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    is_fixed: {
      type: Boolean,
      required: true,
    },
    days: {
      type: Number,
    },
    due_day: {
      type: Number,
    },
    due_gap: {
      type: Number,
    },
    is_deleted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('terms', termsSchema);
