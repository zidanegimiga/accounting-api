const express = require('express');

const router = express.Router();
const fs = require('fs');
const AWS = require('aws-sdk');
const { employeeController } = require('../../../controllers');

const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const { employeeValidation } = require('../../../validations');

module.exports = router;
