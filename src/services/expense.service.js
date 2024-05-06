const { Expense,Configuration,Bill } = require('../models');
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
 * Create a expense
 * @param {Object} body
 * @returns {Promise<Expense>}
 */
const createExpense = async (body) => {
  const expense = await Expense.create(body);
  return { expense };
};

/**
 * Query for Last expense
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Expense>}
 */
const getLastExpense = async (filter) => {
  const latestDoc = await Expense.aggregate([
    {
      $project: {
        _id: 1,
        expense_number: 1
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
const getExpenseTotal = async (filter) => {
  const latestDoc = await Expense.aggregate([
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

/* Query for invoices
* @param {Object} filter - Mongo filter
* @returns {Promise<Expense>}
*/
const queryExpense = async (filter, search, limit, pageNo) => {
 var nPerPage = parseInt(limit)
 var page = parseInt(pageNo)
 var filterField = {
   $and: [{
     is_deleted: 0
   }]
 };
 const initialAggregateArray = [{
   $match: filter
 },
 {
  $lookup: {
    from: 'customers',
    let: {
      customer: '$payee',
    },
    pipeline: [
      {
        $match: {
          $expr: {
            $eq: ['$_id', '$$customer']
          }
        }
      },
      {
        $project: {
          _id: 1,
          customer_name: 1,
        },
      },
    ],
    as: 'payeeInfo',
  },
},
{
  $lookup: {
    from: 'suppliers',
    let: {
      supplier: {
        $ifNull: ['$payee', '$supplier']
      },
    },
    pipeline: [
      {
        $match: {
          $expr: {
            $eq: ['$_id', '$$supplier']
          }
        }
      },
      {
        $project: {
          _id: 1,
          company_name: 1,
        },
      },
    ],
    as: 'supplierInfo',
  },
},
{
  $addFields: {
    payeeInfo: {
      $concatArrays: ['$payeeInfo', '$supplierInfo']
    }
  }
},
{
  $addFields: {
    payeeInfo: {
      $arrayElemAt: ['$payeeInfo', 0]
    }
  }
},
{
  $addFields: {
    "payeeInfo.name": {
      $ifNull: ["$payeeInfo.customer_name", "$payeeInfo.company_name"],
    },
  },
},
{
  $project: {
    supplierInfo: 0,
    "payeeInfo.customer_name": 0,
    "payeeInfo.company_name": 0,
  },
},
 ];

 if (search) {
   filterField.$and.push({
     $or: [{
      expense_number: {
         $regex: '.*' + search + '.*',
         $options: 'i'
       }
     },

     ],
   });
   initialAggregateArray[4] = {
     $match: filterField
   };
 }
 const ExpenseFilteredFieldArray = [
 {
   $sort: {
     created_at: 1
   },
 },
 { $skip: page == 0 ? page : page * nPerPage },
 { $limit: nPerPage }
 ];

 const BillFilteredFieldArray = [
  //   {
  //    $project: {
  //      due_date:1,
  //      invoice_number:1,
  //      customer:'$customer.customer_name',
  //      total:1,
  //      paid:1,
  //      status:1,
  //      items:1,
  //      customer_address:1,
  //      invoice_date:1,
  //      due_date:1
  
  //    }
  //  },
   {
     $sort: {
       created_at: 1
     },
   },
   { $skip: page == 0 ? page : page * nPerPage },
   { $limit: nPerPage }
   ];

   const [ExpensesData, BillData] = await Promise.all([
    Expense.aggregate([...initialAggregateArray,...ExpenseFilteredFieldArray]),
    Bill.aggregate([...initialAggregateArray,...BillFilteredFieldArray]),
  ]);

 
  const result = [...ExpensesData, ...BillData];
  const total_count = result.length;
  const total_page = Math.ceil(total_count / nPerPage);

  return {
    result,
    total_count,
    total_page,
  };
};


module.exports = {
  createExpense,
  getLastExpense,
  getExpenseTotal,
  queryExpense
};
