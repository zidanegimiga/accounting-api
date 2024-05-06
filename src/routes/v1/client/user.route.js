const express = require('express');

const router = express.Router();

const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const { userValidation } = require("../../../validations");
const { userController } = require("../../../controllers");


router
  .route('/')
  .post(auth(), validate(userValidation.createUser), userController.createUser)
  .get(auth(), validate(userValidation.getUsers), userController.getUsers);

router
  .route('/:userId')
  .get(auth(), validate(userValidation.getUser), userController.getUser)
  .patch(auth(), validate(userValidation.updateUser), userController.updateUser)
  .delete(auth(), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;
