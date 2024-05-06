const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    company: {
      type: ObjectId,
      required: true,
    },
    isInventory:{
      type: Boolean,
    },
    sku: {
      type: String,
    },
    is_selling_product:{
      type:Boolean
    },
    is_purchasing_product:{
      type:Boolean
    },
    purchase_info:{
      type:Object
    },
    selling_info:{
      type:Object
    },
    price: {
      type: Number,
    },
    cost: {
      type: Number,
    },
    category: {
      type: String,
    },
    tax_code: {
      type: ObjectId,
      required: true,
    },
    income_account: {
      type: ObjectId,
    },
    expense_account: {
      type: ObjectId,
    },
    quantity: {
      type: Number,
    }, 
     reorder_point: {
      type: Number,
    },
    memo: {
      type: String,
    },
    status: {
      type: Number,
      default: 1,
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

module.exports = mongoose.model('service', ServiceSchema);
