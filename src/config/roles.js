const adminRoles = require('../constants/adminRoles.constant');

const allRoles = {
  client: ['client'],
  admin: [adminRoles.admin],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
