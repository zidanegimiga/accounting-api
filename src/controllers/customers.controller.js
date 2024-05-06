const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const AWS = require('aws-sdk');
const fs = require('fs');
const ApiError = require('../utils/ApiError');
const { ObjectId } = require('mongodb');
const { customersService, activityLogService, userService, invoiceService,accountService } = require('../services');

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

const createCustomer = catchAsync(async (req, res) => {
  const {body}=req
  const {company,customer_name,city}=req.body
  const customer = await customersService.createCustomerBasics(req.body);
  // logActivity(req.user._id, 'customer', customer, 'user created new customer', req.body);
  const data= await accountService.getAccountByFilter({code:'AR',company:ObjectId(company)})
  const {count,account}=data
  const {account_type,details_type,name,_id,is_balance_sheet,account_id}=account
  const accountObj={
  name: `AR-${customer_name}`,
  company: company,
  account_id: account_id + '-' + count.toString().padStart(3, '0'),
  account_type: account_type,
  details_type: details_type,
  base_view: true,
  description: '',
  parent_account_id: _id,
  parent_account_name: name,
  is_balance_sheet: is_balance_sheet,
  customer:customer.customer.id,
  is_sub:true,
  city:city
};
await accountService.createChartOfAccount(accountObj)
  res.status(httpStatus.CREATED).send({ data:customer });
});

const getAll = catchAsync(async (req, res) => {
  const {search,limit,page}=req.query
  const companyIds = req.body.company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const result = await customersService.queryCustomers(filter,search,limit,page);
  res.status(httpStatus.OK).send({ data: result });
});

const getCustomerById = catchAsync(async (req, res) => {
  const result = await customersService.getCustomerById(req.params.id);
  res.status(httpStatus.OK).send({ data: {customer:result} });
});

const updateCustomer = catchAsync(async (req, res) => {
  const result = await customersService.updateCustomerById(req.params.id, req.body);
  logActivity(req.user._id, 'customer', result, 'user updated customer', req.body);
  res.status(httpStatus.OK).send({ data: result });
});

const uploadImage = catchAsync(async (req, res) => {
  const s3 = new AWS.S3({
    accessKeyId: process.env.SECRET_ID_AWS,
    secretAccessKey: process.env.SECRET_KEY_AWS,
  });

  const fileContent = fs.readFileSync(req.files.a.tempFilePath);

  const params = {
    Bucket: process.env.BUCKET_NAME + '/customers',
    Key: req.files.a.name,
    Body: fileContent,
    ACL: 'public-read',
    ContentType: req.files.a.mimetype,
  };

  // Uploading files to the bucket
  s3.upload(params, function (err, data) {
    if (err) {
        console.log(err)
      throw new ApiError(httpStatus.NOT_FOUND, err);
    } else {
      res.json(data.Location);
    }
  });
});

const getCustomerList = catchAsync(async (req, res) => {
  const companyIds = req.body.company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const result = await customersService.getCustomerList(filter);
  res.status(httpStatus.OK).send({data:result});
});

const getCustomerBasics = catchAsync(async (req, res) => {
  const result = await customersService.getCustomerBasics(req.params.id);
  res.status(httpStatus.OK).send({ data: {customer:result} });
});

const getCustomerInvoices = catchAsync(async (req, res) => {
  const result = await invoiceService.getCustomerInvoices(ObjectId(req.params.id));
  res.status(httpStatus.OK).send({ data: {invoices:result} });
});

const bulkUpload = catchAsync(async (req, res) => {
  const result = await customersService.bulkUpload(req);
  await logActivity(req.user._id, 'customer', "", 'user bulk uploaded customer', req.files.file);
  res.status(httpStatus.CREATED).send(result);
});

const exportCustomer = catchAsync(async (req, res) => {
  const result = await customersService.exportCustomer(req.body,req.user._id);
  await logActivity(req.user._id, 'customer', "result", 'user exported customer', '');
  res.status(httpStatus.CREATED).send({data:result})
});

module.exports = {
  createCustomer,
  getAll,
  getCustomerById,
  updateCustomer,
  uploadImage,
  getCustomerList,
  getCustomerBasics,
  bulkUpload,
  exportCustomer,
  getCustomerInvoices
};
