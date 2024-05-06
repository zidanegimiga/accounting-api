const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const creditNoteSchema = new mongoose.Schema(
  {
    credit_note_number: {
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
    is_deleted: {
      type: Number,
      default: 0,
    },
    credit_note_link:{
      type: Array,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('credit_note', creditNoteSchema);
