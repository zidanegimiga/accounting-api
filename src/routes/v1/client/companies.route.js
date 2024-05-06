const express = require('express');
const validate = require('../../../middlewares/validate');
const auth = require('../../../middlewares/auth')
const companyValidation = require('../../../validations');
const { companiesController } = require('../../../controllers')

const router = express.Router();

  router
  .route('/parent-company')
  .post(auth(),companiesController.getAllParentCompany)

  router
  .route('/all')
  .post(auth(),companiesController.getAllCompany)
  
  router
  .route('/new-company')
  .post(auth(),validate(companyValidation.createCompany),companiesController.createCompany);

  router
  .route('/by-id/:id')
  .post(auth(),validate(companyValidation.getCompany),companiesController.getCompanyById)
  // .patch(auth(),validate(companyValidation.getCompany),companiesController.updateCompany)




module.exports = router;