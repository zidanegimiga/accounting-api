const express = require('express');
const config = require('../../config/config');
const clientRoute = require('./client');
const adminRoles = require("../../constants/adminRoles.constant");

const router = express.Router();

const defaultRoutes = [
  {
    path: '',
    route: clientRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});


module.exports = router;
