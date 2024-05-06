const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const { toJSON, paginate, deletion } = require('./plugins');

const chartOfAccountsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    company: {
      type: ObjectId,
      required: true,
    },
    account_id: {
      type: String,
    },
    account_type: {
      type: ObjectId,
      required: true,
    },
    details_type: {
      type: ObjectId,
    },
    standard:{
      type: Boolean,
      default:false
    },
    description: {
      type: String,
    },
    parent_account_id: {
      type: ObjectId,
    },
    parent_account_name: {
      type: String,
    },
    is_sub:{
      type:Boolean
    },
    currency: {
      type: String,
    },
    city:{
      type: String,
    },
    status: {
      type: Number,
      default: 1,
    },
    code: {
      type: String,
    },
    is_balance_sheet:{                     
      type:Boolean,
    },
    base_view:{
      type:Boolean,
    },
    ghost_account:{
      type:Boolean,
    },
    customer: {
      type: ObjectId,
    },
    is_deleted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at', // Use `created_at` to store the created date
      updatedAt: 'updated_at', // and `updated_at` to store the last updated date
    },
  }
);

chartOfAccountsSchema.plugin(toJSON);
chartOfAccountsSchema.plugin(paginate);
chartOfAccountsSchema.plugin(deletion);

module.exports = mongoose.model('chart_of_accounts', chartOfAccountsSchema);
