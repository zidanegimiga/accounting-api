const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ObjectId } = require('mongodb');
const {accountService,userService,activityLogService} = require('../services');


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

const createChartOfAccount = catchAsync(async (req, res) => {
    const {body}=req
    const {is_sub,parent_account_id}=body
    let account_id
    if (is_sub) {
      const account = await accountService.getAccountById(ObjectId(parent_account_id));
      const data = await accountService.getAccountByFilter({ parent_account_id: ObjectId(parent_account_id) });
      account_id = account.account_id + '-' + data.count.toString().padStart(3, '0');
    } else {
      const data = await accountService.getLastAccountByParentId({ parent_account_id: ObjectId(parent_account_id) });
      const entry = data.account_id;
      const lastPart = entry.substr(entry.lastIndexOf('-') + 1); // extract last part of string
      const numberLength = lastPart.length;
      const incremented = (Number(lastPart) + 1).toString().padStart(numberLength, '0'); // convert to number, increment by 1, and pad with leading zeros
      account_id = entry.slice(0, entry.lastIndexOf('-') + 1) + incremented; // concatenate parts of string to form new account_id
    }
    const account = await accountService.createChartOfAccount({...body,account_id:account_id});
     await logActivity(req.user._id, 'chart_of_accountant', account, 'user created a new chart of accountant', body);
    res.status(httpStatus.CREATED).send({data:[]});
});

const getAll = catchAsync(async (req, res) => {
    const {type,status,code,search,limit,page}=req.query
    const companyIds = req.body.company.map((id) => ObjectId(id));
    const filter = { is_deleted: 0,  company: { $in: companyIds }};
     type.length && (filter.account_type=ObjectId(type))
     status.length && (filter.status=parseInt(status))
     code.length && (filter.account_id=code)
    const result = await accountService.queryAccounts(filter,search,limit,page);
    res.status(httpStatus.OK).send({data:result});
});

const updateAccount = catchAsync(async (req, res) => {
    const result = await accountService.updateAccountById(req.params.id, req.body);
    await logActivity(req.user._id, 'chart_of_accountant', result, 'user updated  chart of accountant', req.body);
    res.status(httpStatus.OK).send({data:result});
});

const verifyUid = catchAsync(async (req, res) => {
    let result = false;
    const existingAccount = await accountService.getAccountByUid(req.body.uid_number);
    if (existingAccount) {
      result = true;
    }
    res.send(result);
});

const bulkUpload = catchAsync(async (req, res) => {
    const result = await accountService.bulkUpload(req);
    await logActivity(req.user._id, 'chart_of_accountant', "result", 'user bulk uploaded chart of accountant', req.files.file);
    res.status(httpStatus.CREATED).send(result);
});

const deleteAccount = catchAsync(async (req, res) => {
    await accountService.deleteAccount(req.params.id);
    res.status(httpStatus.NO_CONTENT).send();
  });

  const getAccountList = catchAsync(async (req, res) => {
    const companyIds = req.body.company.map((id) => ObjectId(id));
    const filter = { is_deleted: 0,  company: { $in: companyIds }};
    const result = await accountService.getAccountList(filter);
    res.status(httpStatus.OK).send({data:result});
  });

  const exportAccount = catchAsync(async (req, res) => {
    const result = await accountService.exportAccount(req.body,req.user._id);
    await logActivity(req.user._id, 'chart_of_accountant', "result", 'user exported chart of accountant', '');
    res.status(httpStatus.CREATED).send({data:result})
});

const getAccountConfig = catchAsync(async (req, res) => {
  const filter = { is_deleted: 0,accountType:true};
  const result = await accountService.getAccountConfig(filter);
  res.status(httpStatus.OK).send({ data: result });
});

const getAccountByCode = catchAsync(async (req, res) => {
  const result = await accountService.getAccountByCode(req.body);
  res.status(httpStatus.OK).send({ data: result });
});

const getAccountByType = catchAsync(async (req, res) => {
  const result = await accountService.getAccountByCode({parent_account_id:ObjectId(req.params.id),base_view:true});
  res.status(httpStatus.OK).send({ data: result });
});

const getJournalAccountList = catchAsync(async (req, res) => {
  const companyIds = req.body.company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds },code: { $ne: "VP" }};
  const result = await accountService.getAccountList(filter);
  res.status(httpStatus.OK).send({data:result});
});


module.exports = {
    createChartOfAccount,
    getAll,
    updateAccount,
    verifyUid,
    bulkUpload,
    deleteAccount,
    getAccountList,
    exportAccount,
    getAccountConfig,
    getAccountByCode,
    getAccountByType,
    getJournalAccountList
};
