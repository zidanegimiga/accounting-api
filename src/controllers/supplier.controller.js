const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ObjectId } = require('mongodb');
const { supplierService, activityLogService, userService, customersService } = require('../services');

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

const createSupplier = catchAsync(async (req, res) => {
  const supplier = await supplierService.createSupplier(req.body);
  logActivity(req.user._id, 'supplier', supplier, 'user created new supplier', req.body);
  res.status(httpStatus.CREATED).send({ data: supplier });
});

const getAll = catchAsync(async (req, res) => {
  const {search,limit,page}=req.query
  const companyIds = req.body.company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const result = await supplierService.querySupplier(filter,search,limit,page);
  res.status(httpStatus.OK).send({ data: result });
});

const getSupplierById = catchAsync(async (req, res) => {
  const result = await supplierService.getSupplierById(ObjectId(req.params.id));
  res.status(httpStatus.OK).send({ data: {supplier:result} });
});

const updateSupplier = catchAsync(async (req, res) => {
  const result = await supplierService.updateSupplierById(req.params.id, req.body);
  logActivity(req.user._id, 'supplier', result, 'user updated supplier', req.body);
  res.status(httpStatus.OK).send({ data: result });
});





const getCustomerBasics = catchAsync(async (req, res) => {
  const result = await supplierService.getCustomerBasics(req.params.id);
  res.status(httpStatus.OK).send({ data: {customer:result} });
});

const bulkUpload = catchAsync(async (req, res) => {
  const result = await supplierService.bulkUpload(req);
  await logActivity(req.user._id, 'customer', "", 'user bulk uploaded supplier', req.files.file);
  res.status(httpStatus.CREATED).send(result);
});

const exportSupplier = catchAsync(async (req, res) => {
  const result = await supplierService.exportSupplier(req.body,req.user._id);
  await logActivity(req.user._id, 'supplier', "result", 'user exported supplier', '');
  res.status(httpStatus.CREATED).send({data:result})
});

/**
 * conditionSupplier true -> send only supplier
 * else -> send supplier and customer both
 */
const getAllSupplierCustomer = catchAsync(async (req, res) => {
  const companyIds = req.body.company.map((id) => ObjectId(id));
  const conditionSupplier = req.body.conditionSupplier
  let customer = []
  let supplier = []
  let result = []
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  if(!conditionSupplier){
    customer = await customersService.getCustomerList(filter);
    supplier = await supplierService.getSupplierList(filter);
    result = customer.customers.concat(supplier.suppliers)
    
  }else{
    supplier = await supplierService.getSupplierList(filter);
    result = supplier.suppliers
  }


  res.status(httpStatus.OK).send({ data: result });
});

const getSupplierList = catchAsync(async (req, res) => {
  const companyIds = req.body.company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const result = await supplierService.getSupplierDropDownList(filter);
  res.status(httpStatus.OK).send({data:result});
});


module.exports = {
  createSupplier,
  getAll,
  getSupplierById,
  updateSupplier,
  getCustomerBasics,
  bulkUpload,
  exportSupplier,
  getAllSupplierCustomer,
  getSupplierList
};
