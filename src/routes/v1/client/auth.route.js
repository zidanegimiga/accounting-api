const express = require('express');
const validate = require('../../../middlewares/validate');
const authValidation = require('../../../validations/auth.validation');
const authController = require('../../../controllers/auth.controller');
const auth = require('../../../middlewares/auth');

const router = express.Router();

router.post('/login', validate(authValidation.login), authController.loginClient);
router.post('/logout', validate(authValidation.logout), authController.logout);
router.post('/refresh-tokens', validate(authValidation.refreshTokens), authController.refreshClientTokens);
router.get('/me', auth(), authController.authenticateClient);
router.post('/forgot-password', validate(authValidation.forgotPassword), authController.forgotClientPassword);
router.get('/validate-password-token', validate(authValidation.validatePasswordToken), authController.validatePasswordToken);
router.post('/reset-password', validate(authValidation.resetPassword), authController.resetClientPassword);
router.post('/send-verification-email', authController.sendClientVerificationEmail);
router.post('/centralLogin', authController.centralLogin);
router.post('/centralValidation', authController.centralValidation);

module.exports = router;
