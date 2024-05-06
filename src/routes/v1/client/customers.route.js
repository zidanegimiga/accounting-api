const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth');
const {customerValidation,commonValidation} = require('../../../validations');
const { customersController } = require('../../../controllers');

const router = express.Router();

router.route('/all').post(auth(),validate(commonValidation.checkCompany), customersController.getAll);
router.route('/').post(auth(), customersController.createCustomer);

router
  .route('/by-id/:id')
  .post(auth(), validate(customerValidation.getCustomer), customersController.getCustomerById)
  .patch(auth(), validate(customerValidation.getCustomer), customersController.updateCustomer);

router.route('/upload-image').post(customersController.uploadImage);
router.route('/list').post(auth(),validate(commonValidation.checkCompany),customersController.getCustomerList);
router.route('/info/:id').post(auth(), validate(customerValidation.getCustomer), customersController.getCustomerBasics)
router.route('/customer-invoice/:id').post(auth(), validate(customerValidation.getCustomer), customersController.getCustomerInvoices)
router.route('/bulk-upload').post(auth(),customersController.bulkUpload);
router.route('/export').post(auth(),customersController.exportCustomer);

module.exports = router;
