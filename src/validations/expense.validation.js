const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createSupplier = {
  body: Joi.object().keys({
    company_name: Joi.string().custom(objectId).required(),
    primary_contact: Joi.object().required(),
    company: Joi.string().custom(objectId).required(),
    bank_account: Joi.string().custom(objectId).required(),
  }),
};

const createBill = {
  body: Joi.object().keys({
    supplier: Joi.string().custom(objectId).required(),
    company: Joi.string().custom(objectId).required(),
    terms: Joi.string().custom(objectId).required(),
    terms_name: Joi.string().required(),
    bill_date: Joi.date().required(),
    items: Joi.array().required(),
    total: Joi.number().required(),
    sub_total: Joi.number().required(),
    vat_total: Joi.number().required()
  }),
};

const createExpense = {
  body: Joi.object().keys({
    payee: Joi.string().custom(objectId).required(),
    company: Joi.string().custom(objectId).required(),
    payment_account: Joi.string().custom(objectId).required(),
    payment_date: Joi.date().required(),
    payment_location: Joi.string().required(),
    items: Joi.array().required(),
    total: Joi.number().required(),
    sub_total: Joi.number().required(),
    vat_total: Joi.number().required()
  }),
};
const getId = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createSupplier,
  getId,
  createBill,
  createExpense,
};
