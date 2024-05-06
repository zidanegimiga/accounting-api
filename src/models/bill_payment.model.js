const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const billPaymentSchema = new mongoose.Schema(
  {
    payee: {
      type: ObjectId,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    company: {
      type: ObjectId,
      required: true,
    },
    bank_account: {
      type: ObjectId,
      required: true,
    },
    mailing_address: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    payment_date: {
      type: Date,
      required: true,
    },
    payment_mode: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
    },
    notes: {
      type: Number,
    },
    documents: {
      type: Array,
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

module.exports = mongoose.model('bill_payment', billPaymentSchema);
