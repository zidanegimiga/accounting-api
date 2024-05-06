const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const billSchema = new mongoose.Schema(
  {
    supplier: {
      type: ObjectId,
      required: true,
    },
    company: {
      type: ObjectId,
      required: true,
    },
    mailing_address: {
      type: String,
    },
    bill_number: {
      type: String,
      required: true,
    },
    terms: {
      type: ObjectId,
      required: true,
    },
    terms_name: {
      type: String,
      required: true,
    },
    bill_date: {
      type: Date,
      required: true,
    },
    due_date: {
      type: Date,
    },
    reference: {
      type: String,
    },
    payment_location: {
      type: String,
    },
    items: {
      type: Array,
      required: true,
    },
    sub_total: {
      type: Number,
      required: true,
    },
    vat_total: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    memo: {
      type: String,
    },
    documents: {
      type: Array,
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

module.exports = mongoose.model('bill', billSchema);
