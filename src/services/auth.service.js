const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const authController = require('../controllers/auth.controller');
const { Token } = require('../models');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
// const { clientService, graphService } = require('./index');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const { ObjectId } = require('mongodb');


const SECRET_KEY = process.env.SECRET_KEY;
const CENTRAL_URL = process.env.CENTRAL_URL;

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);

  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }

  const authorized = await user.isPasswordMatch(password);
  if (!authorized) {
    incrementLoginAttempt(user);
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }

  return { user };
};

/**
 * Login with username For Centralization 
 * 
 * 
 * @param {string} email
 * @returns {Promise<Object>}
 */
const loginUserWithEmail = async (email) => {
  const user = await userService.getUserByEmail(email);
  return { user };
};




/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};


/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(ObjectId(refreshTokenDoc.userId));
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    // throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
    throw new ApiError(httpStatus.UNAUTHORIZED, error.message);
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword, isClient = true) => {
  // try {
  //   const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
  //   const user = !isClient
  //     ? await userService.getUserById(resetPasswordTokenDoc.user)
  //     : await clientService.getClientById(resetPasswordTokenDoc.user);
  //   if (!user) {
  //     throw new Error();
  //   }
  //   if (!isClient) {
  //     await userService.updateUserById(user.id, { password: newPassword });
  //   } else {
  //     await clientService.updateClientById(user.id, { password: newPassword });
  //   }
  //   await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  // } catch (error) {
  //   console.log(error);
  //   throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  // }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  // try {
  //   const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
  //   const user = await clientService.getClientById(verifyEmailTokenDoc.user);
  //   if (!user) {
  //     throw new Error();
  //   }
  //   await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
  //   await clientService.updateClientById(user.id, { isEmailVerified: true });
  // } catch (error) {
  //   throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  // }
};

const outlookSignIn = async (project) => {
  try {
    const scopes = project.outlookScopes || 'https://graph.microsoft.com/.default';
    const urlParameters = {
      scopes: scopes.split(','),
      redirectUri: process.env.OAUTH_RED222IRECT_URI,
    };

    const authUrl = await req.app.locals.msalClient.getAuthCodeUrl(urlParameters);

    return authUrl;
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication Failed');
  }
};

const centralLogin = async (req, res) => {
  let { email, password, type, otp } = req.body;
  let result;
  email = email.toLowerCase();
  email = email.trim();
  encrypt_email = CryptoJS.AES.encrypt(email, SECRET_KEY).toString();
  const centralBody = {
    email: encrypt_email,
    product_id: process.env.CENTRAL_DB_PRODUCT_ID,
    type: type,
    otp: otp,
  };
  let URL = CENTRAL_URL + 'users/centralLogin';
  await axios
    .post(URL, centralBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(async (response) => {
      let product_access = response.data.data;
      access = product_access.filter((prod) => prod.product_id == process.env.CENTRAL_DB_PRODUCT_ID);
      if (response.data.success && access.length > 0) {
        try {
          if (type == 'O365') {
            var email = req.body.email;
            email = email.toLowerCase();
            email = email.trim();
            let user = await UsersModel.findByEmail(email);
            if (!user) {
              return res.status(401).send({ error: 'No User Found' });
            }

            // msalClient = await user.loginMsalClient()
            req.app.locals.msalClients[user._id] = msalClient;
            // console.log(req.app.locals.msalClients,"--------req.app.locals.msalClients")
            await user.checkRole();
            let userId = user._id;
            let auth_conf = process.env.AUTH_2FA;
            const tokens = await user.generateAuthTokens();
            const token = await user.generateAuthToken();
            const isAdmin = user.isAdmin;
            const isEmployee = user.isEmployee;
            const isHR = user.isHR;
            const isManager = user.isManager;
            const isFinanceMgr = user.isFinanceMgr;
            const isHRMgr = user.isHRMgr;
            const isSalAcc = user.isSalAcc;
            const isOnboarding = user.isOnboarding;
            const userFirstLogin = await user.checkUserFirstLogin();
            const userInfo = user;
            const secret_key = process.env.SECRET_KEY;
            // const access_pages = await user.getAccessPages()
            const session = await user.startSession();

            let success = true;

            return {
              success,
              auth_conf,
              userId,
              user,
              tokens,
              isAdmin,
              isHR,
              isManager,
              isEmployee,
              isFinanceMgr,
              isHRMgr,
              isSalAcc,
              isOnboarding,
              userFirstLogin,
              userInfo,
              secret_key,
              userCount: 0,
              configCount: 0,
              session,
              token,
              product_access,
            };
          } else if (type == 'REDIRECT') {
            var email = req.body.email;
            email = email.toLowerCase();
            email = email.trim();
            let user =await userService.getUserByEmail(email)
            if (!user) {
              return res.status(401).send({ error: 'No User Found' });
            }
            success = true;
            let userInfo = await loginUserWithEmail(req.body.email.toLowerCase());
            result = { userInfo, product_access }
           
          } else {
            let userInfo = await loginUserWithEmailAndPassword(req.body.email.toLowerCase(), password);
            result = { userInfo, product_access };
          }
        } catch (error) {
          console.log(error);
        }
      } else {
        res.status(200).json({ success: false, message: 'Login failed! No product access found.', data: [] });
      }
    })
    .catch((e) => {
      success = false;
      res.status(400).json({ success: false, message: 'Login failed! Incorrect username and password.', data: [] });
    });
  return result;
};
const centralValidation = async (req, res) => {
  let { email } = req.body;
  email = email.toLowerCase();
  email = email.trim();

  const centralBody = {
    email: email,
  };
  let URL = CENTRAL_URL + 'users/centralValidation';

  await axios
    .post(URL, centralBody, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then((response) => {
      res.status(200).json({ success: true, message: 'OTP set', data: response.data.data });
    })
    .catch((e) => {
      // console.log(e.error);
    });
};

module.exports = {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
  outlookSignIn,
  centralLogin,
  centralValidation,
  loginUserWithEmail
};
