const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { accountConfigService } = require('../services');
const { getAccounts } = require('../helpers/account');

const createAccountConfig = catchAsync(async (req, res) => {
  const { body } = req;
  const accountConfig = await accountConfigService.createAccountConfig(body);
  res.status(httpStatus.CREATED).send({ data: accountConfig });
});

const bulkUpload = catchAsync(async (req, res) => {
  const result = await accountConfigService.bulkUpload(req);
  res.status(httpStatus.CREATED).send(result);
});

const createStandardAccount = catchAsync(async (req, res) => {
  const accounts = await accountConfigService.getSubTypeCloneAccount({standard:true,is_deleted: 0});
  const result = await accountConfigService.createStandardAccount(accounts);
  res.status(httpStatus.CREATED).send(accounts);
});

const createSubTypeCloneAccount = catchAsync(async (req, res) => {
  const data = await accountConfigService.getSubTypeCloneAccount({detailType: true,standard: { $exists: false },is_deleted: 0});
  const modifiedAccounts = data.map((account, index) => {
    const accountId = `AC-${account.baseCode}-${account.parentCode}-${account.code}-${(index + 6)
      .toString()
      .padStart(4, '0')}`;
    return {
      name: account.name,
      account_id: accountId,
      account_type: account.parent_account_id,
      details_type: account._id,
      base_view: true,
      description: '',
      parent_account_id: account._id,
      parent_account_name: account.name,
      is_balance_sheet: account.is_balance_sheet,
    };
  });
  const result = await accountConfigService.createStandardAccount(modifiedAccounts);
  res.status(httpStatus.CREATED).send(result);
});

const createStandardCompanyAccount = async (company) => {
  const { country_code, state_code, city_code, legal_entity, _id,account_configurator,city } = company;
  const accounts = await accountConfigService.getSubTypeCloneAccount({standard:true,is_deleted: 0});
  const modifiedAccounts = accounts.map((account, index) => {
  const separatedStrings = account.standard_code.split("-");
  const name = separatedStrings[0];
  const code = separatedStrings[1];
    const accountId = `${country_code}-${state_code}-${city_code}-${legal_entity}-${account.baseCode}-${account.parentCode}-${account.code}-${(index).toString().padStart(parseInt(account_configurator), '0')}`;
    return {
      name: name,
      company: _id,
      account_id: accountId,
      account_type: account.parent_account_id,
      details_type: account._id,
      base_view: true,
      description: '',
      parent_account_id: account._id,
      parent_account_name: account.name,
      is_balance_sheet: account.is_balance_sheet,
      code:code,
      city:city
    };
  });
  const result = await accountConfigService.createStandardAccount(modifiedAccounts);
  return result;
}

const createSubTypeCompanyAccount = async (company) => {
  const { country_code, state_code, city_code, legal_entity, _id,account_configurator,city } = company;
  const data = await accountConfigService.getSubTypeCloneAccount({detailType: true,standard: { $exists: false },is_deleted: 0});
  const modifiedAccounts = data.map((account, index) => {
    const accountId = `${country_code}-${state_code}-${city_code}-${legal_entity}-${account.baseCode}-${ account.parentCode }-${account.code}-${(index + 5).toString().padStart(parseInt(account_configurator), '0')}`;
    return {
      name: account.name,
      company: _id,
      account_id: accountId,
      account_type: account.parent_account_id,
      details_type: account._id,
      base_view: true,
      description: '',
      parent_account_id: account._id,
      parent_account_name: account.name,
      is_balance_sheet: account.is_balance_sheet,
      city:city
    };
  });
  const result = await accountConfigService.createStandardAccount(modifiedAccounts);
  return result;
};

const createShadowCompanyAccount = async (company) => {
  const { country_code, state_code, city_code, legal_entity, _id,account_configurator,city } = company;
  const accounts = await accountConfigService.getSubTypeCloneAccount({is_shadow:true,is_deleted: 0});
  console.log(accounts)
  const modifiedAccounts = accounts.map((account, index) => {
    return {
      name: account.name,
      company: _id,
      account_id: 000,
      account_type: account.parent_account_id,
      details_type: account._id,
      description: '',
      parent_account_id: account._id,
      parent_account_name: account.name,
      is_balance_sheet: account.is_balance_sheet,
      city:city,
      ghost_account:true
    };
  });
  const result = await accountConfigService.createStandardAccount(modifiedAccounts);
  return result;
}

module.exports = {
  createAccountConfig,
  bulkUpload,
  createStandardAccount,
  createSubTypeCloneAccount,
  createSubTypeCompanyAccount,
  createStandardCompanyAccount,
  createShadowCompanyAccount
};
