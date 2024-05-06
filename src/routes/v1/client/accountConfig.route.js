const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const {commonValidation} = require('../../../validations');
const { accountConfigController } = require('../../../controllers')

const router = express.Router();

router.route('/').post(auth(),accountConfigController.createAccountConfig);
router.route('/bulk-upload').post(auth(),accountConfigController.bulkUpload);
router.route('/create-standard').post(auth(),accountConfigController.createStandardAccount);
router.route('/create-subtype-clone-account').post(auth(),accountConfigController.createSubTypeCloneAccount);




module.exports = router;