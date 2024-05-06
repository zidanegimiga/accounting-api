const Joi = require('joi');
const {objectId } = require('./custom.validation');


const createTaxCode = {
  body: Joi.object().keys({
    code: Joi.string().required(),
    name: Joi.string().required(),
    rate: Joi.number().required(),
  }),
};

const getTaxCode = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
 createTaxCode,
 getTaxCode
};
