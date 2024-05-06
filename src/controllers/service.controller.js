const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { productService, activityLogService, userService,accountService } = require('../services');
const { ObjectId } = require('mongodb');

const logActivity = async (userId, module, moduleInfo, action, data) => {
  const user = await userService.getUserById(userId);
  const activity = {
    user,
    module,
    module_info: moduleInfo,
    action,
    data,
  };
  await activityLogService.createLog(activity);
};

const createService = catchAsync(async (req, res) => {
  const { body } = req;
  const service = await productService.createService(body);
  logActivity(req.user._id, 'service', service, 'user created a new service', body);
  res.status(httpStatus.CREATED).send({ data: service });
});

const getAll = catchAsync(async (req, res) => {
  const { type, search, limit, page } = req.query;
  const companyIds = req.body.company.map((id) => ObjectId(id));
  var filter = { is_deleted: 0,  company: { $in: companyIds }};
  type.length && (filter.type = type);
  const result = await productService.queryServices(filter, search, limit, page);
  res.status(httpStatus.OK).send({ data: result });
});

const updateService = catchAsync(async (req, res) => {
  const { body } = req;
  const result = await productService.updateServiceById(req.params.id, body);
  logActivity(req.user._id, 'cost center', result, 'user updated service', body);
  res.status(httpStatus.OK).send({ data: result });
});

const deleteService = catchAsync(async (req, res) => {
  await productService.deleteService(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const getInfo = catchAsync(async (req, res) => {
  const result =await getInfoByAccount(req.params.id,req.body)
  res.status(httpStatus.OK).send({ data: {product:result} });
});

const getInfoByAccount = async (id,data) => {
  const {customer,company}=data
  const result = await productService.getInfo(id);
  const debit = await accountService.getAccountByCode({company:ObjectId(company),customer:ObjectId(customer)});
  const credit = await accountService.getAccountByCode({code:'SL',company:ObjectId(company)});
  const vat = await accountService.getAccountByCode({code:'VP',company:ObjectId(company)});
  
  if (result.accounts.credit.length === 0) {
    result.accounts.credit.push(credit);
    result.accounts.credit.push(vat);
  } else {
    result.accounts.credit.push(vat);
  }
  if (result.accounts.debit.length === 0) {
    result.accounts.debit.push(debit);
  }
  return result;
};

const getProductList = catchAsync(async (req, res) => {
  const companyIds = req.body.company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const result = await productService.getProductList(filter);
  res.status(httpStatus.OK).send({data:result});
});

module.exports = {
  createService,
  getAll,
  updateService,
  deleteService,
  getInfo,
  getInfoByAccount,
  getProductList
};
