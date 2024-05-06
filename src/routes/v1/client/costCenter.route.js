const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const {costCenterValidation, commonValidation} = require('../../../validations');
const { costCenterController } = require('../../../controllers')

const router = express.Router();

router.route('/all').post(auth(),validate(commonValidation.checkCompany),costCenterController.getAll);
router.route('/').post(auth(),validate(costCenterValidation.createCostCenter),costCenterController.createCostCenter);

router.route('/by-id/:id')
.patch(auth(),validate(costCenterValidation.getCostCenter),costCenterController.updateCostCenter)
.delete(auth(),validate(costCenterValidation.getCostCenter),costCenterController.deleteCostCenter)

router.route('/bulk-upload').post(auth(),costCenterController.bulkUpload);
router.route('/export').post(auth(),validate(commonValidation.checkCompany),costCenterController.exportCostCenter);

module.exports = router;