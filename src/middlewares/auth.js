const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { roleRights } = require('../config/roles');

const verifyCallback = (req, resolve, reject) => async (err, data, info) => {
  if (err || info || !data) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  req.user = data.user;
  req.decode = data.decode;

  // TODO: PERFORM YOUR OWN ADDITIONAL VALIDATION HERE, WE USUALLY USE VALIDATING ROLES HERE TO RESTRICT A PERSON FROM ACCESSING THIS ROUTE
  // if (!hasRequiredRights) {
  //   return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
  // }

  resolve();
};

const auth = () => async (req, res, next) => {
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject))(req, res, next);
  })
    .then(() => next())
    .catch((err) => next(err));
};

module.exports = auth;
