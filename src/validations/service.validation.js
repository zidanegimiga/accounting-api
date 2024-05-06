const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createService = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    type: Joi.string().required(),
    sku: Joi.string().required(),
    cost: Joi.string().required(),
    tax_code: Joi.string().custom(objectId).required(),
    income_account: Joi.string().custom(objectId).required(),
  }),
};

const getService = {
    params: Joi.object().keys({
      id: Joi.string().custom(objectId),
    }),
  };

module.exports = {
  createService,
  getService
};
