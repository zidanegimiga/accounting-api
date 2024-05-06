const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const invoiceValidation = require('../../../validations');
const { journalEntryController } = require('../../../controllers')

const router = express.Router();

router.route('/').post(auth(),validate(invoiceValidation.createJournalEntry),journalEntryController.createJournalEntry);
router.route('/by-id/:id').patch(auth(),journalEntryController.updateJournalEntry)
router.route('/by-invoice/:id').post(auth(),journalEntryController.getJournalByInvoice);

module.exports = router;