const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const invoiceValidation = require('../../../validations');
const { recurringInvoiceController } = require('../../../controllers')

const router = express.Router();

router.route('/').post(auth(),validate(invoiceValidation.createInvoiceTemplate),recurringInvoiceController.createInvoiceTemplate);
router.route('/').get(recurringInvoiceController.testCron);



module.exports = router;