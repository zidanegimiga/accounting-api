const Joi = require('joi');
const {objectId } = require('./custom.validation');


const createCustomer = {
  body: Joi.object().keys({
    customer_name: Joi.string().required(),
    // point_of_contact: Joi.object().required(),
    // registration_no: Joi.string().required(),
    // industries: Joi.array().required(),
    // email: Joi.string().required(),
    // phone: Joi.string().required(),
    // website: Joi.string().required(),
    // location: Joi.string().required(),
    // city: Joi.string().required(),
    // office_number: Joi.string().required(),
    // account_number: Joi.string().required(),
    // lcc_number: Joi.string().required(),
    // account_type: Joi.string().required(),
    // decision_maker: Joi.object().required(),
    // lead_source: Joi.string().required(),
    company: Joi.string().custom(objectId).required(),
  }),
};

const getCustomer = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createCustomer,
  getCustomer
};
