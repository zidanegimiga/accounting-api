const mongoose = require('mongoose');
const { toJSON, paginate, deletion } = require('./plugins');
const { ObjectId } = require('mongodb');

const supplierSchema = new mongoose.Schema(
  {
     
    company_name: {
      type: String,
      required: true,
    },
    primary_contact: {
      type: Object,
      required: true,
    },
    company:{
      type:ObjectId,
      required: true,
    },
    nick_name:{
      type: String,
    },
    supplier_id: {
      type: String,
    },
    email: {
      type: String,
    },
    phone: {
      type: String,
    },
    website : {
      type: String,
    },
    mobile: {
      type: String,
    },
    fax : {
      type: String,
    },
    trn_number:{
      type:String
    },
    bank_account:{
      type:ObjectId,
      required: true,
    },
    address:{
      type:String
    },
    documents:{
      type:Array
     },
     status: {
      type: Number,
      default: 1,
    },
    is_deleted: {
      type: Number,
      default: 0,
    }
  },
  {
    timestamps: {
      createdAt: 'created_at', // Use `created_at` to store the created date
      updatedAt: 'updated_at', // and `updated_at` to store the last updated date
    },
  }
);

supplierSchema.plugin(toJSON);
supplierSchema.plugin(paginate);
supplierSchema.plugin(deletion);


module.exports = mongoose.model('supplier', supplierSchema);
