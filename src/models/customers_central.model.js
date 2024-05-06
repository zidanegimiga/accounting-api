const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const customersCentralSchema = new mongoose.Schema(
  {
     
    customer_name: {
      type: String,
      required: true,
    },
     customer_id: {
      type: String,
    },
    company:{
      type:ObjectId,
      required: true,
    },
    registration_no: {
      type: String,
    },
    industries : {
      type: Array,
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
    location: {
      type: String,
    },
    city: {
      type: String,
    },
    office_number : {
      type: String,
    },  
    account_number: {
      type: String,
    },
    lcc_number : {
      type: String,
    },  
    account_type: {
      type: String,
    },
    primary_contact: {
      type: Object,
      required: true,
    },
    additional_contact : {
      type: Object,
    },
    lead_source: {
      type: String,
    },
    country: {
      type: String,
    },
    no_of_employees: {
      type: String,
    },
    working_hours: {
      type: Number,
    },
    working_days: {
      type: Number,
    },
    logo:{
      type:String
    },
    billing_address:{
      type:String
    },
    shipping_address:{
      type:String
    },
    documents:{
     type:Array
    },
    is_business:{
     type:Boolean,
     required: true,
    },
    trn_number:{
      type:String
    },
    terms:{
     type:ObjectId
    },
    currency:{
      type:String
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

module.exports = customersCentralSchema;
