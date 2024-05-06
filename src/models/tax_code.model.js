const mongoose = require('mongoose');

const taxCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    rate: {
      type: Number,
      required: true,
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

module.exports = mongoose.model('tax_code', taxCodeSchema);
