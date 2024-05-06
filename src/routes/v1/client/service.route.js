const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const {serviceValidation, commonValidation} = require('../../../validations');
const { serviceController } = require('../../../controllers')

const router = express.Router();

router.route('/all').post(auth(),validate(commonValidation.checkCompany), serviceController.getAll);
router.route('/').post(auth(),serviceController.createService);
router.route('/by-id/:id')
.patch(auth(), validate(serviceValidation.getService), serviceController.updateService)
.delete(auth(), validate(serviceValidation.getService),serviceController.deleteService);

router.route('/journal-info/:id').post(auth(), validate(serviceValidation.getService), serviceController.getInfo)
router.route('/list').post(auth(),validate(commonValidation.checkCompany),serviceController.getProductList);



module.exports = router;