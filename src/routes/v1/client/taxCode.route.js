const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const taxCodeValidation = require('../../../validations');
const { taxCodeController } = require('../../../controllers')

const router = express.Router();

router.route('/all').post(auth(),taxCodeController.getAll);
router.route('/').post(auth(),validate(taxCodeValidation.createTaxCode),taxCodeController.createTaxCode);

router.route('/by-id/:id')
.patch(auth(),validate(taxCodeValidation.getTaxCode),taxCodeController.updateTaxCode)
.delete(auth(),validate(taxCodeValidation.getTaxCode),taxCodeController.deleteTaxCode)

router.route('/bulk-upload').post(auth(),taxCodeController.bulkUpload);
router.route('/list').post(auth(),taxCodeController.getTaxCodeList);

module.exports = router;