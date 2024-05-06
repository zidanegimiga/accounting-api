const { RecurringInvoiceTemplate } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const moment = require('moment');


/**
 * Create a Recurring Invoice Template
 * @param {Object} body
 * @returns {Promise<RecurringInvoiceTemplate>}
 */
const createInvoiceTemplate = async (body) => {
  const invoice = await RecurringInvoiceTemplate.create(body);
  return {
    invoice,
  };
};


/**
 * Query for list of recurring  invoices based on day
 * @param {Object} filter - Mongo filter
 * @returns {Promise<RecurringInvoiceTemplate>}
 */
const getRecurringInvoiceTemplate = async (type,additionalFilter) => {
  const today = moment().format('YYYY-MM-DD');
  var filter={
    is_deleted: 0,
    // 'recurring_frequency.interval':type,
    $or: [
      { "recurring_frequency.end_date": null },
      { "recurring_frequency.end_date": { $gte: today } }
    ],
    
  }
  const recurringInvoiceTemplate = await RecurringInvoiceTemplate.aggregate([
    {
      $match: filter
    },
    {
      $lookup: {
        from: 'terms',
        let: {
          terms: '$terms',
        },
        pipeline: [{
            $match: {
              $expr: {
                $and: [{
                  $eq: ['$_id', '$$terms']
                }]
              }
            }
          },
          {
            $project: {
              name: 1,
              days: 1,
            },
          },
        ],
        as: 'termInfo',
      },
    },
    {
      $addFields: {
        terms: {
          $arrayElemAt: ['$termInfo', 0]
        }
      }
    },
    {
      $project: {
        termInfo: 0,
     },
    },
  ]);
  return recurringInvoiceTemplate;
};

/**
* Query for list of reminder recurring  invoices based on day
* @param {Object} filter - Mongo filter
* @returns {Promise<RecurringInvoiceTemplate>}
*/
const getReminderInvoiceTemplate = async () => {
 const today = moment().format('YYYY-MM-DD');

 const reminderInvoiceTemplates = await RecurringInvoiceTemplate.aggregate([
   {
     $match: {
      is_reminder:true,
       is_deleted: 0,
       $or: [
         { "recurring_frequency.end_date": null },
         { "recurring_frequency.end_date": { $gte: today } }
       ]
     },
   },
 ]);
 return reminderInvoiceTemplates;
};


module.exports = {
  createInvoiceTemplate,
  getRecurringInvoiceTemplate,
  getReminderInvoiceTemplate
};
