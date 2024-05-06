const Joi = require('joi');
const {objectId } = require('./custom.validation');


const createChartOfAccount = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    account_type: Joi.string().required(),
    details_type: Joi.string().required(),
    uid_number:Joi.string().required(),
    description: Joi.string().required(),
    company: Joi.string().custom(objectId).required(),
    is_balance_sheet: Joi.number(),
    level1: Joi.string(),
    level2: Joi.string(),
    level3: Joi.string(),
  }),
};

const getAccount = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const verifyUid = {
  body: Joi.object().keys({
    uid_number: Joi.string().required(),
  }),
};

module.exports = {
    createChartOfAccount,
    getAccount,
    verifyUid
};
