const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { taxCodeService, activityLogService, userService } = require('../services');

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

const createTaxCode = catchAsync(async (req, res) => {
  const taxCode = await taxCodeService.createTaxCode(req.body);
  await logActivity(req.user._id, 'tax Code', taxCode, 'user created a new tax Code', req.body);
  res.status(httpStatus.CREATED).send({ data: taxCode });
});

const getAll = catchAsync(async (req, res) => {
  const {search,limit,page}=req.query
  const filter = { is_deleted: 0 };
  const result = await taxCodeService.queryTaxCodes(filter,search,limit,page);
  res.status(httpStatus.OK).send({ data: result });
});

const getTaxCodeById = catchAsync(async (req, res) => {
  const result = await taxCodeService.getTaxCodeById(req.params.id);
  res.status(httpStatus.OK).send({ data: result });
});

const updateTaxCode = catchAsync(async (req, res) => {
  const result = await taxCodeService.updateTaxCodeById(req.params.id, req.body);
  await logActivity(req.user._id, 'tax Code', result, 'user updated tax Code', req.body);
  res.status(httpStatus.OK).send({ data: result });
});

const bulkUpload = catchAsync(async (req, res) => {
  const result = await taxCodeService.bulkUpload(req);
  await logActivity(req.user._id, 'tax Code', '', 'user bulk uploaded tax codes', req.files.file);
  res.status(httpStatus.CREATED).send(result);
});

const deleteTaxCode = catchAsync(async (req, res) => {
  await taxCodeService.deleteTaxCode(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const getTaxCodeList = catchAsync(async (req, res) => {
  const filter = { is_deleted: 0 };
  const result = await taxCodeService.getTaxCodeList(filter);
  res.status(httpStatus.OK).send({data:result});
});

module.exports = {
  createTaxCode,
  getAll,
  getTaxCodeById,
  updateTaxCode,
  bulkUpload,
  deleteTaxCode,
  getTaxCodeList
};
