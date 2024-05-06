const accessRoles = {
  SUPER_ADMIN: 900,

  OWNER: 1001,
  FULL_ACCESS: 1002,

  CLIENT_SIGNUP: 1100,
  CLIENT_LOGIN: 1101,
  CLIENT_DASHBOARD: 1102,

  API_EMPLOYEE: 1201,
  API_MEETING: 1202,

  EMP_ADMIN: 1300,
  EMP_APPROVE_MEETING: 1301,
  EMP_CREATE_MEETING: 1302,
};

const accessRolesList = Object.values(accessRoles);

module.exports = {
  accessRoles,
  accessRolesList,
};
