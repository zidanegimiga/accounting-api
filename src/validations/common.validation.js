const Joi = require('joi');
const {objectId } = require('./custom.validation');

const checkCompany = {
  body: Joi.object().keys({
    company: Joi.array().required(),
    days: Joi.number(),
    level1: Joi.string(),
    from_date: Joi.string(),
    to_date: Joi.string(),
    conditionSupplier: Joi.boolean(),
    isCredit: Joi.boolean(),
    typeTaxData: Joi.string(),
    cityData: Joi.string()
  }),
};

const createAccountConfig={
  body: Joi.object().keys({
    primaryCategory: Joi.string().required(),
    children: Joi.array().required(),
    isBalanceSheet: Joi.boolean().required(),
    isDebitAccount: Joi.boolean().required(),
    category: Joi.string().required(),
    trialBalanceDebitType: Joi.boolean().required(),
    isReportValuePositive:Joi.boolean().required()
  }),
}

const getId = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};



module.exports = {
  checkCompany,
  createAccountConfig,
  getId
};
