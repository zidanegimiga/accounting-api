const httpStatus = require('http-status');
// const { ObjectId } = require('mongodb');
const { ActivityLog,InvoiceLog,JournalEntryLog } = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a log
 * @param {Object} logBody
 * @returns {Promise<ActivityLog>}
 */
const createLog = async (logBody) => {
  return ActivityLog.create(logBody);
};

/**
 * Create a log for invoice
 * @param {Object} logBody
 * @returns {Promise<InvoiceLog>}
 */
const createInvoiceLog = async (logBody) => {
  return InvoiceLog.create(logBody);
};

/**
 * Create a log for invoice
 * @param {Object} logBody
 * @returns {Promise<JournalEntryLog>}
 */
const createJournalEntryLog = async (logBody) => {
  return JournalEntryLog.create(logBody);
};


module.exports = {
  createLog,
  createInvoiceLog,
  createJournalEntryLog
};
