const mongoose = require('mongoose');
const { toJSON, paginate, deletion } = require('./plugins');
const { ObjectId } = require('mongodb');

const companySchema = new mongoose.Schema(
  {
    company_name: {
      type: String,
      required: true,
    },
    is_parent_org: {
      type: Boolean,
      default: false,
      required: true,
    },
    company_logo : {
      type: String,
    },
    parent_company_id : {
      type: ObjectId,
      default: null,
    },
    tax_registration_label: {
      type: String,
    },
    tax_registration_no: {
      type: String,
    },
    business_address : {
      type: String,
    },
    billing_address : {
      type: String,
    },
    shipping_address : {
      type: String,
    },
    currency : {
      type: String,
    },
    language: {
      type: String,
      default: "en",
    },
    time_zone: {
      type: String,
    },
    vat_registration_date: {
      type: Date,
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
    state: {
      type: String,
    },
    country: {
      type: String,
    },
    country_code:{
      type: String,
    },
    state_code:{
      type: String,
    },
    city_code:{
      type: String,
    },
    account_configurator:{
      type: String,
    },
    legal_entity:{
      type: String,
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

companySchema.plugin(toJSON);
companySchema.plugin(paginate);
companySchema.plugin(deletion);


module.exports = mongoose.model('companies', companySchema);
