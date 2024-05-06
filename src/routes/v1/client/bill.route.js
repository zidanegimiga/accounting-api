const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const expenseValidation = require('../../../validations');
const { billController } = require('../../../controllers')

const router = express.Router();

router.route('/').post(auth(),validate(expenseValidation.createBill),billController.createBill);


module.exports = router;