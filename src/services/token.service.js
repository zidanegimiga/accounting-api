const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const config = require('../config/config');
const userService = require('./user.service');
const employeeService = require('./employee.service');
const { Token } = require('../models');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
// const {clientService} = require("./index");

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (user, expires, type, secret = config.jwt.secret) => {
  const payload = {
    _id: user._id,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
 saveToken = async (token, userId, expires, type, blacklisted = false, isClient = true) => {
  const tokenDoc = await Token.create({
    token,
    userId: userId,
    isClient,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
  const payload = jwt.verify(token, config.jwt.secret);
  const tokenDoc = await Token.findOne({ token, type, userId: payload._id, blacklisted: false });
  if (!tokenDoc) {
    throw new Error('Token not found');
  }
  return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user, isClient = true, overrideExpiryNumber = null, ignoreRefreshToken = false) => {
  // console.log("----",user)
  let { accessExpirationMinutes } = config.jwt;
  if (overrideExpiryNumber) {
    accessExpirationMinutes = overrideExpiryNumber;
  }
  const accessTokenExpires = moment().add(accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user, accessTokenExpires, tokenTypes.ACCESS);

  if (ignoreRefreshToken) {
    return accessToken;
  }

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'hours');
  const refreshToken = generateToken(user, refreshTokenExpires, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH, false, isClient);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email, isClient = true) => {
  // const user = isClient ? await clientService.getClientByEmail(email) : await userService.getUserByEmail(email);
  // if (!user) {
  //   throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  // }
  // const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  // const resetPasswordToken = generateToken(user, expires, tokenTypes.RESET_PASSWORD);
  // await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD, false, isClient);
  // return resetPasswordToken;
  return []
};

/**
 * Generate verify email token
 * @param {User} user
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (user, isClient = false) => {
  const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(user, expires, tokenTypes.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL, false, isClient);
  return verifyEmailToken;
};

/**
 * Get token
 * @param {ObjectId} userId
 * @param {String} type
 * @returns {Promise<string>}
 */
const getToken = async (userId, type) => {
  return Token.findOne({ user: userId, type });
};

module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  getToken,
};
