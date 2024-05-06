const transaction = require('./transaction');

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    transaction.rollbackTransaction();
    next(err);
  });
};

module.exports = catchAsync;
