const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const recurringInvoiceSchema = new mongoose.Schema(
  {
    customer: {
      type: ObjectId,
      required: true,
    },
    branch: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    billing_address: {
      type: String,
      required: true,
    },
    shipping_address: {
      type: String,
      required: true,
    },
    profile_name: {
      type: String
    },
    order_number: {
      type: String
    },
    terms: {
      type: ObjectId,
      required: true,
    },
    sale_location: {
      type: String,
      required: true,
    },
    sale_person: {
      type: String
    },
    items: {
      type: Array,
      required: true,
    },
    sub_total: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    recurring_frequency: {
      type: Object,
      required: true,
    },
    customer_notes: {
      type: String,
      required: true,
    },
    terms_condition: {
      type: String,
      required: true,
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

module.exports = mongoose.model('recurring_invoice_template', recurringInvoiceSchema);
