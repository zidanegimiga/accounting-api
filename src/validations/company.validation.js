const Joi = require('joi');
const {objectId } = require('./custom.validation');


const createCompany = {
  body: Joi.object().keys({
    company_name: Joi.string().required(),
    is_parent_org: Joi.boolean().required(),
    parent_company_id:Joi.string().required(),
  }),
};

const getCompany = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createCompany,
  getCompany
};
