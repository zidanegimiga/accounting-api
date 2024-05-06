const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ObjectId } = require('mongodb');
const { costCenterService,activityLogService,userService } = require('../services');

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

const createCostCenter = catchAsync(async (req, res) => {
  const {body}=req
  const costCenter = await costCenterService.createCostCenter(body);
  logActivity(req.user._id, 'cost center', costCenter, 'user created a new cost center', body);
  res.status(httpStatus.CREATED).send({ data: costCenter });
});

const getAll = catchAsync(async (req, res) => {
  const {search,limit,page}=req.query
  const companyIds = req.body.company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const result = await costCenterService.queryCostCenters(filter,search,limit,page);
  res.status(httpStatus.OK).send({ data: result });
});

const getCostCenterById = catchAsync(async (req, res) => {
  const result = await costCenterService.getCostCenterById(req.params.id);
  res.status(httpStatus.OK).send({ data: result });
});

const updateCostCenter = catchAsync(async (req, res) => {
  const {body}=req
  const result = await costCenterService.updateCostCenterById(req.params.id, body);
  logActivity(req.user._id, 'cost center', result, 'user updated cost center', body);
  res.status(httpStatus.OK).send({ data: result });
});


const bulkUpload = catchAsync(async (req, res) => {
  const result = await costCenterService.bulkUpload(req);
  await logActivity(req.user._id, 'costCenter', "", 'user bulk uploaded cost center', req.files.file);
  res.status(httpStatus.CREATED).send(result);
});

const deleteCostCenter = catchAsync(async (req, res) => {
  await costCenterService.deleteCostCenter(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const exportCostCenter = catchAsync(async (req, res) => {
  const companyIds = req.body.company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const result = await costCenterService.exportCostCenter(req.body,req.user._id);
  await logActivity(req.user._id, 'costCenter', "result", 'user exported costCenter', '');
  res.status(httpStatus.CREATED).send({data:result})
});


module.exports = {
  createCostCenter,
  getAll,
  getCostCenterById,
  updateCostCenter,
  bulkUpload,
  deleteCostCenter,
  exportCostCenter
};
