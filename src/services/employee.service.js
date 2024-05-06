/* eslint-disable prettier/prettier */
const httpStatus = require('http-status');
const mongoose = require('mongoose');

const { ObjectId } = mongoose.Types;
const { Employee } = require('../models');
const ApiError = require('../utils/ApiError');
/**
 * Create a employee
 * @param {Object} employeeBody
 * @returns {Promise<Employee>}
 */
const createEmployee = async (employeeBody) => {
  if (await Employee.isEmailTaken(employeeBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return Employee.create(employeeBody);
};

/**
 * Query for employees
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryEmployees = async (filter, options) => {
  const employees = await Employee.paginate(filter, options);
  return employees;
};
/**
 * Get employee by id
 * @param {ObjectId} id
 * @returns {Promise<Employee>}
 */
const getEmployee = async (filter) => {
  return Employee.findOne(filter);
};

/**
 * Get employee by id
 * @param {ObjectId} id
 * @returns {Promise<Employee>}
 */
const getEmployeeById = async (id) => {
  return Employee.findById(id);
};

/**
 * Get employee by ref id
 * @param {ObjectId} id
 * @returns {Promise<Employee>}
 */
const getEmployeeByRefId = async (id) => {
  return Employee.findOne({ reference_id: id });
}

/**
 * Get employee by email
 * @param {string} email
 * @returns {Promise<Employee>}
 */
const getEmployeeByEmail = async (email) => {
  return Employee.findOne({ email });
};

/**
 * Update employee by id
 * @param {ObjectId} employeeId
 * @param {Object} updateBody
 * @returns {Promise<Employee>}
 */
const updateEmployeeById = async (employeeId, updateBody) => {
  const employee = await getEmployeeById(employeeId);
  if (!employee) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  if (updateBody.email && (await Employee.isEmailTaken(updateBody.email, employeeId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  let body = updateBody;

  delete body.__v;

  return Employee.findOneAndUpdate({ _id: employeeId }, { $set: body }, { new: true });
};

const updateEmployeeByRefId = async (refId, updateBody) => {
  const employee = await getEmployeeByRefId(refId);
  if (!employee) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  if (updateBody.email && (await Employee.isEmailTaken(updateBody.email, refId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  let body = updateBody;

  delete body.__v;

  return Employee.findOneAndUpdate({ _id: employee }, { $set: body }, { new: true });
};

/**
 * Delete employee by id
 * @param {ObjectId} employeeId
 * @returns {Promise<Employee>}
 */
const deleteEmployeeById = async (employeeId) => {
  const employee = await getEmployeeById(employeeId);
  if (!employee) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  await employee.flagAsDeleted();
  return employee;
};

const deleteEmployeeByRefId = async (refId) => {
  const employee = await getEmployeeByRefId(refId);
  if (!employee) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
  }
  await employee.flagAsDeleted();
  return employee;
};

module.exports = {
  createEmployee,
  queryEmployees,
  getEmployee,
  getEmployeeById,
  getEmployeeByEmail,
  updateEmployeeById,
  deleteEmployeeById,
  getEmployeeByRefId,
  updateEmployeeByRefId,
  deleteEmployeeByRefId,
};
