const Joi = require('joi');
const { password } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    // add more fields here that is needed for signup if we do have one
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
    type: Joi.string().allow('', null),
    otp: Joi.string().allow('', null),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const validatePasswordToken = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const tokenvalidate = {
  body: Joi.object().keys({
    email: Joi.string().required(),
  }),
};

const verifyFreelancerOtp = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    otp: Joi.string().required(),
    isLogin: Joi.boolean(),
  }),
};
const verifyFreelancerOtpForgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    otp: Joi.string().required(),
  }),
};

const verifyAuthToken = {
  body: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  validatePasswordToken,
  resetPassword,
  verifyEmail,
  tokenvalidate,
  verifyFreelancerOtp,
  verifyFreelancerOtpForgotPassword,
  verifyAuthToken,
};
