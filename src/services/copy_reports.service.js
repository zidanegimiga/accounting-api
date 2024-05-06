const { Company, Account, JournalEntry } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');


const getTrailBalance = async (filter, from_date, to_date, companyIds) => {
  let totalCredit = {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ["$line_items.isCredit", true] },
          ]
        }, { '$toInt': "$line_items.amount" }, 0,
      ],
    },
  }
  let totalDebit = {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ["$line_items.isDebit", true] },
          ]
        }, { '$toInt': "$line_items.amount" }, 0,
      ],
    },
  }
  let je_lookup = {
    $lookup: {
      from: "journal_entries",
      let: {
        accountid: "$_id"
      },
      pipeline: [
        {
          $match: {
            createdAt: { $gte: from_date, $lt: to_date },
            company: { $in: companyIds }
          }
        },
        {
          $unwind: "$line_items"
        },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$line_items.account", "$$accountid"] }
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            creditSum: totalCredit,
            debitSum: totalDebit
          }
        }
        // {
        //     $project: {
        //         _id: 0,
        //         first_name: 1,
        //         middle_name: 1,
        //         last_name: 1,
        //         image_url:1
        //     },
        // },
      ],
      as: "JE",
    },
  }

  const trail_balance = await Account.aggregate([
    {
      $addFields: { isCreditAC: false, isDebitAC: false, credit: 0, debit: 0, isZeroAC: false }
    },
    {
      $match: filter,
    },
    je_lookup,
    {
      $project: {
        _id: 1,
        is_balance_sheet: 1,
        details_type: 1,
        level1: 1,
        level2: 1,
        uid_number: 1,
        name: 1,
        account_type: 1,
        code: 1,
        company: 1,
        isCreditAC: 1,
        isDebitAC: 1,
        isZeroAC: 1,
        JE: "$JE",

      },
    },
    {
      $sort: { is_balance_sheet: -1, level1 : 1, level2 : 1 },
    },
  ]);

  return { trail_balance };
};

const getAccountTransactionDetails = async (filter, companyIds) => {
  // let totalCredit = {
  //   $sum: {
  //     $cond: [
  //       {
  //         $and: [
  //           { $eq: ["$line_items.isCredit", true] },
  //         ]
  //       }, { '$toInt': "$line_items.amount" }, 0,
  //     ],
  //   },
  // }
  // let totalDebit = {
  //   $sum: {
  //     $cond: [
  //       {
  //         $and: [
  //           { $eq: ["$line_items.isDebit", true] },
  //         ]
  //       }, { '$toInt': "$line_items.amount" }, 0,
  //     ],
  //   },
  // }
  // let jv_group = {
  //   $group:  {
  //       _id: {
  //         $month: "$journal_date",
  //       },
  //       totalcredit: {
  //         $sum: {
  //           $cond: [
  //             {
  //               $and: [
  //                 {
  //                   $eq: [
  //                     "$line_items.isCredit",
  //                     true,
  //                   ],
  //                 },
  //               ],
  //             },
  //             {
  //               $toInt: "$line_items.amount",
  //             },
  //             0,
  //           ],
  //         },
  //       },
  //   },
  // }
  let je_lookup = {
    $lookup: {
      from: "journal_entries",
      let: {
        accountid: "$_id"
      },
      pipeline: [
        {
          $match: {
            company: { $in: companyIds }
          }
        },
        {
          $unwind: "$line_items"
        },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$line_items.account", "$$accountid"] }
              ],
            },
          },
        },
        // jv_group
        // {
        //   $group: {
        //     _id: null,
        //     creditSum: totalCredit,
        //     debitSum: totalDebit
        //   }
        // }
        // {
        //     $project: {
        //         _id: 0,
        //         first_name: 1,
        //         middle_name: 1,
        //         last_name: 1,
        //         image_url:1
        //     },
        // },
      ],
      as: "JE",
    },
  }

  const account_details = await Account.aggregate([
    {
      $addFields: { details: [] }
    },
    {
      $match: filter,
    },
    je_lookup,
    {
      $project: {
        _id: 0,
        uid_number: 1,
        name: 1,
        account_type: 1,
        code: 1,
        company: 1,
        JE: "$JE",
        details: 1

      },
    },
    {
      $sort: { created_at: 1 },
    },
  ]);
  return { account_details };
};

const getBalanceSheet = async (filter, from_date, to_date, companyIds) => {
  let totalCredit = {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ["$line_items.isCredit", true] },
          ]
        }, { $multiply: [{ '$toInt': "$line_items.amount" }, -1] }, 0,
      ],
    },
  }
  let totalDebit = {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ["$line_items.isDebit", true] },
          ]
        }, { '$toInt': "$line_items.amount" }, 0,
      ],
    },
  }
  let je_lookup = {
    $lookup: {
      from: "journal_entries",
      let: {
        accountid: "$_id"
      },
      pipeline: [
        {
          $match: {
            createdAt: { $gte: from_date, $lt: to_date },
            company: { $in: companyIds }
          }
        },
        {
          $unwind: "$line_items"
        },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$line_items.account", "$$accountid"] }
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            creditSum: totalCredit,
            debitSum: totalDebit
          }
        }
        // {
        //     $project: {
        //         _id: 0,
        //         first_name: 1,
        //         middle_name: 1,
        //         last_name: 1,
        //         image_url:1
        //     },
        // },
      ],
      as: "JE",
    },
  }
  const balance_sheet = await Account.aggregate([
    {
      $addFields: { amount: 0 }
    },
    {
      $match: filter,
    },
    je_lookup,
    {
      $project: {
        _id: 1,
        is_balance_sheet: 1,
        details_type: 1,
        level1: 1,
        level2: 1,
        uid_number: 1,
        name: 1,
        account_type: 1,
        code: 1,
        company: 1,
        JE: "$JE",
        amount: 1,
      },
    },
    {
      $sort: { "level1": 1 },
    },
  ]);
  return { balance_sheet };
};

const getProfitLoss = async (filter, from_date, to_date, companyIds) => {
  let totalCredit = {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ["$line_items.isCredit", true] },
          ]
        }, { $multiply: [{ '$toInt': "$line_items.amount" }, -1] }, 0,
      ],
    },
  }
  let totalDebit = {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ["$line_items.isDebit", true] },
          ]
        }, { '$toInt': "$line_items.amount" }, 0,
      ],
    },
  }
  let je_lookup = {
    $lookup: {
      from: "journal_entries",
      let: {
        accountid: "$_id"
      },
      pipeline: [
        {
          $match: {
            company: { $in: companyIds }
          }
        },
        {
          $match: {
            createdAt: { $gte: from_date, $lt: to_date }
          }
        },
        {
          $unwind: "$line_items"
        },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$line_items.account", "$$accountid"] }
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            creditSum: totalCredit,
            debitSum: totalDebit
          }
        }
        // {
        //     $project: {
        //         _id: 0,
        //         first_name: 1,
        //         middle_name: 1,
        //         last_name: 1,
        //         image_url:1
        //     },
        // },
      ],
      as: "JE",
    },
  }
  const profit_loss = await Account.aggregate([
    {
      $addFields: { amount: 0 }
    },
    {
      $match: filter,
    },
    je_lookup,
    {
      $project: {
        _id: 1,
        is_balance_sheet: 1,
        details_type: 1,
        level1: 1,
        level2: 1,
        uid_number: 1,
        name: 1,
        account_type: 1,
        code: 1,
        company: 1,
        JE: "$JE",
        amount: 1,
      },
    },
    {
      $sort: { created_at: 1 },
    },
  ]);
  return { profit_loss };
};

module.exports = {
  getTrailBalance,
  getAccountTransactionDetails,
  getBalanceSheet,
  getProfitLoss,
};
