const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth');
const {expenseValidation,commonValidation} = require('../../../validations');
const { supplierController } = require('../../../controllers');

const router = express.Router();

router.route('/').post(auth(), supplierController.createSupplier);
router.route('/all').post(auth(),validate(commonValidation.checkCompany), supplierController.getAll);

router
  .route('/by-id/:id')
  .post(auth(), validate(expenseValidation.getId), supplierController.getSupplierById)
  .patch(auth(), validate(expenseValidation.getId), supplierController.updateSupplier);

router.route('/bulk-upload').post(auth(),supplierController.bulkUpload);
router.route('/export').post(auth(),supplierController.exportSupplier);

router.route('/list-all-supplier-customer').post(auth(),validate(commonValidation.checkCompany), supplierController.getAllSupplierCustomer);
router.route('/list').post(auth(),supplierController.getSupplierList);


module.exports = router;
