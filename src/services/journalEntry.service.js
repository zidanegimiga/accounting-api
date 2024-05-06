const { JournalEntry } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const { ObjectId } = require('mongodb');


/**
 * Create a Tax Code
 * @param {Object} body
 * @returns {Promise<JournalEntry>}
 */
const createJournalEntry = async (body) => {
  const journalEntry = await JournalEntry.create(body);
  return { journalEntry };
};

/**
* Query for Last journal Entry
* @param {Object} filter - Mongo filter
* @returns {Promise<JournalEntry>}
*/
const getLastJournalEntry = async (filter) => {
  const latestDoc = await JournalEntry.aggregate([
    {
      $project: {
        _id: 1,
        journal_number: 1
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
 * Get for journal Entry by id
 * @param {number} id
 * @returns {Promise<JournalEntry>}
 */
const getJournalById = async (id) => {
  const journalEntry = await JournalEntry.findById(id);
  return journalEntry;
};


/**
 * Update journal Entry by id
 * 
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<JournalEntry>}
 */
const updateJournalEntry = async (id, updateBody) => {
  const journalEntry = await getJournalById(id);
  if (!journalEntry) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(journalEntry, updateBody);
  await journalEntry.save();
  return journalEntry;
};

/**
 * Get for journal Entry by account id
 * @returns {Promise<JournalEntry>}
 */
const getJournalByAccountId = async (accountList) => {
  let totalJEAccount = 0
  const journalEntryTotal = await JournalEntry.aggregate([
    {
      $unwind: "$line_items"
    },
    {
      $match: {
        is_deleted: 0,
        "line_items.account": { $in: accountList }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $toInt: "$line_items.amount" } }
      }
    },
    {
      $project: {
        _id: 0,
        amount: "$total",
      }
    }

  ]);
  const account_lookup = {
    $lookup: {
      from: "chart_of_accounts",
      let: {
        accountid: "$_id"
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$_id", "$$accountid"] }
              ],
            },
          },
        },

      ],
      as: "AC",
    },
  }
  if( journalEntryTotal.length > 0) {
    totalJEAccount = journalEntryTotal[0].amount
  }else{
    totalJEAccount = 1
  }
  const journalEntry = await JournalEntry.aggregate([
    {
      $unwind: "$line_items"
    },
    {
      $match: {
        "line_items.account": { $in: accountList }
      }
    },
    {
      $group: {
        _id: "$line_items.account",
        total: { $sum: { $toInt: "$line_items.amount" } },
        count: { $sum: 1 }
      }
    },
    account_lookup,
    { $unwind: "$AC" },
    {
      $addFields: { total_amount: totalJEAccount }
    },
    {
      $project: {
        _id: 0,
        id: "$_id",
        amount: "$total",
        name: "$AC.name",
        total_amount: 1,
        "percentage": {
          $trunc: [
            {
              $multiply: [
                100,
                { $divide: ["$total", totalJEAccount] }
              ]
            }, 2
          ]
        },
      }
    }

  ]);
  return journalEntry;
};

//get info for journal entry while doing invoice action
const getJournalByInvoice = async (id) => {
  const journalInfo = await JournalEntry.findOne({ invoice: ObjectId(id) },{ _id: 1, line_items: 1 });
  return journalInfo
};

module.exports = {
  createJournalEntry,
  getLastJournalEntry,
  updateJournalEntry,
  getJournalByAccountId,
  getJournalByInvoice
};
