const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth');
const { saleController } = require('../../../controllers');
const router = express.Router();

router.route('/location').post(auth(),saleController.getSaleLocation);
router.route('/all').post(auth(),saleController.getAll);
router.route('/menu').post(auth(),saleController.getSaleMenu);


module.exports = router;