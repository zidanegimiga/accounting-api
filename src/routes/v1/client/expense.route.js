const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const expenseValidation = require('../../../validations');
const { expenseController } = require('../../../controllers')

const router = express.Router();
router.route('/all').post(auth(),expenseController.getAll);
router.route('/').post(auth(),validate(expenseValidation.createBill),expenseController.createExpense);
router.route('/journal-info/:id').post(auth(),validate(expenseValidation.getId),expenseController.getExpenseJournal);
router.route('/menu').post(auth(),expenseController.getExpenseMenu);



module.exports = router;