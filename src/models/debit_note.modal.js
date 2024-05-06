const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const debitNoteSchema = new mongoose.Schema(
  {
    debit_note_number: {
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
    company: {
      type: ObjectId,
      required: true,
    },
    branch: {
      type: String,
    },
    reference: {
      type: String,
    },
    created_date: {
      type: Date,
      required: true,
    },
    debit_note_date:{
      type: Date,
      required: true,
    },
    due_date: {
      type: Date,
      required: true,
    },
    sale_person: {
      type: String,
    },
    subject: {
      type: String,
    },
    notes: {
      type: String,
    },
    terms: {
      type: ObjectId,
    },
    terms_name: {
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
    },
    total: {
      type: Number,
      required: true,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    balance_due:{
      type: Number,
    },
    status: {
      type: String,
    },
    is_deleted: {
      type: Number,
      default: 0,
    },
    debit_note_link:{
      type: Array,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('debit_note', debitNoteSchema);
