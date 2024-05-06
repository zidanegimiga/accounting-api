const { Term } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

/**
 * Create a term
 * @param {Object} body
 * @returns {Promise<Term>}
 */
const createTerms = async (body) => {
  const term = await Term.create(body);
  return {
    term,
  };
};

/**
 * Query for terms
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Term>}
 */
const queryTerms = async (filter) => {
    const terms = await Term.find(filter,{name:1,is_fixed:1,days:1,due_day:1,due_gap:1});
    return {terms};
};

module.exports = {
  createTerms,
  queryTerms,
};
