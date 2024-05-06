const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const {commonValidation} = require('../../../validations');
const { reportsController } = require('../../../controllers')

const router = express.Router();

  router
  .route('/trail-balance')
  .post(auth(),validate(commonValidation.checkCompany),reportsController.getTrailBalance)

  router
  .route('/account-details/:id')
  .post(auth(),reportsController.getAccountTransactionDetails)
  
  router
  .route('/balance-sheet')
  .post(auth(),validate(commonValidation.checkCompany),reportsController.getBalanceSheet)

  // router
  // .route('/balance-sheet-details/:id')
  // .post(auth(),reportsController.getBalanceSheetTransactionDetails)

  router
  .route('/profit-loss')
  .post(auth(),validate(commonValidation.checkCompany),reportsController.getProfitLoss)

  // router
  // .route('/profit-loss-details/:id')
  // .post(auth(),reportsController.getProfitLossTransactionDetails)

  router
  .route('/dashboard')
  .post(auth(),validate(commonValidation.checkCompany),reportsController.getDashboardDetails)

  router
  .route('/expenseWidget')
  .post(auth(),validate(commonValidation.checkCompany),reportsController.getDashboardExpenseDetails)

  router
  .route('/send-email')
  .post(auth(),reportsController.sendEmail);


  router
  .route('/vatReport')
  .post(auth(),validate(commonValidation.checkCompany),reportsController.getVatReport)

  
  router
  .route('/vatReportDetails')
  .post(auth(),validate(commonValidation.checkCompany),reportsController.getVatReportDetails)

module.exports = router;