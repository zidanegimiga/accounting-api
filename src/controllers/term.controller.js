const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { termsService, activityLogService, userService } = require('../services');

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

const createTerms = catchAsync(async (req, res) => {
  const { body } = req;
  const service = await termsService.createTerms(body);
  logActivity(req.user._id, 'terms', service, 'user created a new term', body);
  res.status(httpStatus.CREATED).send({ data: service });
});

const getAll = catchAsync(async (req, res) => {
  const filter = { is_deleted: 0 };
  const result = await termsService.queryTerms(filter);
  res.status(httpStatus.OK).send({ data: result });
});



module.exports = {
  createTerms,
  getAll
};
