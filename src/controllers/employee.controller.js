const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const {
  employeeService,
} = require('../services');

const createEmployee = catchAsync(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  res.status(httpStatus.CREATED).json({ employee });
});

const getEmployees = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'firstName',
    'lastName',
    'email',
    'mobile',
    'department',
    'designation',
    'projectId',
    'referenceId',
  ]);

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await employeeService.queryEmployees(filter, options);
  res.json(result);
});

const getEmployee = catchAsync(async (req, res) => {
  const employee = await employeeService.getEmployeeById(req.params.employee_id);
  if (!employee) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  res.json(employee);
});

const getEmployeeByRefId = catchAsync(async (req, res) => {
  const employee = await employeeService.getEmployeeByRefId(req.params.reference_id);
  if (!employee) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  res.json(employee);
});


const getEmployeeByEmail = catchAsync(async (req, res) => {
  const employee = await employeeService.getEmployeeByEmail(req.params.email);
  if (!employee) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  res.json(employee);
});

const updateEmployee = catchAsync(async (req, res) => {
  const employee = await employeeService.updateEmployeeById(req.user.id, req.body, false, req.user.id);
  console.log({ employee });
  res.json(employee);
});

const updateEmployeeByRefId = catchAsync(async (req, res) => {
  const employee = await employeeService.updateEmployeeById(req.user.id, req.body, false, req.user.id);
  console.log({ employee });
  res.json(employee);
});

const deleteEmployee = catchAsync(async (req, res) => {
  await employeeService.deleteEmployeeById(req.params.employee_id);
  res.status(httpStatus.NO_CONTENT).send();
});

const deleteEmployeeByRefId = catchAsync(async (req, res) => {
  await employeeService.deleteEmployeeByRefId(req.params.reference_id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createEmployee,
  getEmployees,
  getEmployee,
  getEmployeeByEmail,
  updateEmployee,
  deleteEmployee,
  getEmployeeByRefId,
  updateEmployeeByRefId,
  deleteEmployeeByRefId,
};
