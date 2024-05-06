const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth');
const {accountValidation, commonValidation} = require('../../../validations');
const { accountsController } = require('../../../controllers');

const router = express.Router();

router.route('/all').post(auth(),validate(commonValidation.checkCompany),accountsController.getAll);
router.route('/').post(auth(), accountsController.createChartOfAccount);

router.route('/by-id/:id') 
.patch(auth(), validate(accountValidation.getAccount), accountsController.updateAccount)
.delete(auth(), validate(accountValidation.getAccount),accountsController.deleteAccount);

router.route('/verify-uid').post(auth(),validate(accountValidation.verifyUid), accountsController.verifyUid);
router.route('/bulk-upload').post(auth(),accountsController.bulkUpload);
router.route('/list').post(auth(),accountsController.getAccountList);
router.route('/export').post(auth(),accountsController.exportAccount);
router.route('/config').post(auth(),accountsController.getAccountConfig);
router.route('/account-by-code').post(auth(),accountsController.getAccountByCode);
router.route('/account-by-type/:id').post(auth(),accountsController.getAccountByType);
router.route('/journal-account-list').post(auth(),accountsController.getJournalAccountList);




module.exports = router;