const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const estimateSchema = new mongoose.Schema(
  {
     estimate_number: {
      type: String,
      required: true,
    },
    customer: {
      type: ObjectId,
      required: true,
    },
    customer_name: {
      type: String,
      required: true,
    },
    billing_address: {
      type: String,
      required: true,
    },
    estimate_date: {
      type: Date,
      required: true,
    },
     expiry_date: {
      type: Date,
      required: true,
    },
    sale_location: {
      type: String,
      required: true,
    },
    sale_person: {
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
    status: {
      type: String,
    },
    is_recurring: {
      type: Boolean,
      required: true,
    },
    is_draft: {
      type: Boolean,
      default: false,
    },
    recurring_template:{
      type: ObjectId,
    },
    subject: {
      type: String,
    },
    customer_notes: {
      type: String,
    },
    terms_condition: {
      type: String,
      default:null
    },
    documents: {
      type: Array,
    },
    estimate:{
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

module.exports = mongoose.model('estimate', estimateSchema);
