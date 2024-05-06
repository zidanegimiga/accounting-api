const { Company } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

/**
 * Create a company
 * @param {Object} body
 * is_parent_org -> need to be false for all the child company
 * @returns {Promise<Companies>}
 */
const createCompany = async (body) => {
  const company = await Company.create(body);
  return { company };
};

/**
 * Query for companies
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Companies>}
 */

const queryCompanies = async (filter, project) => {
  const companies = await Company.aggregate([
    {
      $match: filter,
    },
    {
      $project: project,
    },
    {
      $sort: { created_at: 1 },
    },
  ]);

  return { companies };
};

/**
 * Query for companies
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Companies>}
 */

const getCompany = async (filter) => {
  const companies = await Company.aggregate([
    {
      $match: filter,
    },
    {
      $sort: { created_at: 1 },
    },
  ]);

  return { companies };
};

/**
 * Get for company by id
 * @param {number} id
 * @returns {Promise<Companies>}
 */
const getCompanyById = async (id) => {
  const company = await Company.findById(id);
  return company;
};

/**
 * Update company by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Companies>}
 */
const updateCompanyById = async (id, updateBody) => {
  const company = await getCompanyById(id);
  if (!company) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(company, updateBody);
  await company.save();
  return company;
};

module.exports = {
  createCompany,
  updateCompanyById,
  queryCompanies,
  getCompany,
  getCompanyById
};
