const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const invoiceValidation = require('../../../validations');
const { invoiceController } = require('../../../controllers')

const router = express.Router();

router.route('/all').post(auth(),invoiceController.getAll);
router.route('/').post(auth(),validate(invoiceValidation.createInvoice),invoiceController.createInvoice);

router
  .route('/by-id/:id')
  .post(auth(), validate(invoiceValidation.getInvoice), invoiceController.getInvoiceById)
  .patch(auth(), validate(invoiceValidation.getInvoice), invoiceController.updateInvoice);
  
router.route('/record-payment').post(auth(),validate(invoiceValidation.recordPayment),invoiceController.recordPayment);
router.route('/credit-note').post(auth(),invoiceController.createCreditNote);
router.route('/debit-note').post(auth(),invoiceController.createDebitNote);
router.route('/invoice-link').post(auth(),invoiceController.createInvoiceLink);
router.route('/send-email').post(auth(),invoiceController.sendEmail);
router.route('/send-reminder').post(auth(),invoiceController.sendEmail);
router.route('/cancel-invoice').post(auth(),invoiceController.cancelInvoice);
router.route('/account-info/:id').post(auth(),invoiceController.getAccountInfo);
router.route('/invoice-journal').post(auth(),invoiceController.getInvoiceJournal);
router.route('/invoice-mail-template').post(auth(),invoiceController.getInvoiceMailTemplate);
// router.route('/due-invoice').post(auth(),invoiceController.invoiceStatusCron);

module.exports = router;