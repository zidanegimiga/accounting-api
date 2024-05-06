const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const costCenterValidation = require('../../../validations');
const { termController } = require('../../../controllers')

const router = express.Router();

router.route('/all').post(auth(),termController.getAll);
router.route('/').post(auth(),termController.createTerms);


module.exports = router;