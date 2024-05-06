const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const expenseSchema = new mongoose.Schema(
  {
    payee: {
      type: ObjectId,
      required: true,
    },
    company: {
      type: ObjectId,
      required: true,
    },
    payment_account: {
      type: ObjectId,
      required: true,
    },
    expense_number: {
      type: String,
      required: true,
    },
    payment_date: {
      type: Date,
      required: true,
    },
    reference: {
      type: String,
    },
    payment_methods: {
      type: String,
    },
    payment_location: {
      type: String,
      required: true,
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
    billing_address: {
      type: String,
    },
    shipping_address: {
      type: String,
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

module.exports = mongoose.model('expense', expenseSchema);
