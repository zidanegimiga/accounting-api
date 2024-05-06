const { Bill } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const excelReader = require('../helpers/excel-reader');
const XLSX = require('xlsx');
const AWS = require('aws-sdk');
const moment = require('moment');
const csv = require('csv-writer');
const fs = require('fs');
const { ObjectId } = require('mongodb');
/**
 * Create a bill
 * @param {Object} body
 * @returns {Promise<Bill>}
 */
const createBill = async (body) => {
  const bill = await Bill.create(body);
  return { bill };
};

/**
 * Query for Last bill
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Bill>}
 */
const getLastBill = async (filter) => {
  const latestDoc = await Bill.aggregate([
    {
      $project: {
        _id: 1,
        bill_number: 1
      }
    },
    {
      $sort: {
        _id: -1
      }
    },
    {
      $limit: 1
    }
  ])

  return latestDoc[0]
};

/**
 * Query for total expense
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Expense>}
 */
const getBillTotal = async (filter) => {
  const latestDoc = await Bill.aggregate([
    {
      $match: filter
    },
    {
      $group: {
        _id: null,
        total_amount: { $sum: "$total" }
      }
    },
  ])

  return latestDoc[0]
};


module.exports = {
  createBill,
  getLastBill,
  getBillTotal,
};
