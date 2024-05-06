const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const invoiceLinkSchema = new mongoose.Schema(
  {
    link: {
      type: String,
      required: true,
    },
    customer: {
      type: ObjectId,
      required: true,
    },
     invoice: {
      type: ObjectId,
      required: true,
    },
    expiry: {
      type: Date,
    },
    is_deleted: {
      type: Number,
      default: 0,
    },
    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('invoice_link', invoiceLinkSchema);
