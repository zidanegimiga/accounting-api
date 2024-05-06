const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const accountConfiguratorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    is_balance_sheet: {
      type: Boolean,
      required: true,
    },
    parent_account_id:{
      type:ObjectId,
    },
    isDebitAccount: {
      type: Boolean,
    },
    trialBalanceDebitType: {
      type: Boolean,
    },
    isReportValuePositive: {
      type: Boolean,
    },
    accountType:{
      type: Boolean,
    },
    detailType:{
      type: Boolean,
    },
    code:{
     type:String
    },
    standard:{
      type: Boolean,
    },
    standard_code:{
      type: String ,
    },
    is_shadow:{
     type:Boolean,
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

module.exports = mongoose.model('account_configurator', accountConfiguratorSchema);
