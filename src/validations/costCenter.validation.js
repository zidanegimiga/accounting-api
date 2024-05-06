const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createCostCenter = {
  body: Joi.object().keys({
    code: Joi.string().required(),
    name: Joi.string().required(),
    rate: Joi.number().required(),
    company: Joi.string().custom(objectId).required(),
  }),
};

const getCostCenter = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createCostCenter,
  getCostCenter,
};
