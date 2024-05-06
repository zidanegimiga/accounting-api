const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const paymentSchema = new mongoose.Schema(
  {
    customer: {
      type: ObjectId,
      required: true,
    },
     invoice: {
      type: ObjectId,
      required: true,
    },
    company: {
      type: ObjectId,
      required: true,
    },
    debit_note: {
      type: ObjectId,
    },
    amount: {
      type: Number,
      required: true,
    },
    bank_charge: {
      type: Number,
    },
    payment_date: {
      type: Date,
      required: true,
    },
    payment_mode: {
      type: String,
      required: true,
    },
    deposit_to: {
      type: ObjectId,
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
    is_thanks_required: {
      type: Boolean,
      required: true,
    },
    is_thanks_sent: {
      type: Boolean,
    },
    isInvoice:{
      type:Boolean
    },
    isDebitNote:{
      type:Boolean
    },
    is_deleted: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('payment', paymentSchema);
