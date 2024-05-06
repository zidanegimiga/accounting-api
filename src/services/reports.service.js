const { Company, Account, JournalEntry } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const { ObjectId } = require('mongodb');


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
      $sort: { is_balance_sheet: -1, level1: 1, level2: 1 },
    },
  ]);

  return { trail_balance };
};

const getAccountTransactionDetails = async (filter, companyIds, customerfilterBy) => {

  /**
 * other filters
 */
  let matchJE = {
    $expr: {
      $and: [
        { $eq: ["$line_items.account", "$$accountid"] }
      ],
    },
  }
  if (customerfilterBy != "none") {
    matchJE.$expr.$and.push({ $in: ["$line_items.customer", customerfilterBy] })
  }
  /**
   * end other filters
   */

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
          $match: matchJE
        },
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

const getBalanceSheet = async (filter, from_date, to_date, companyIds, reportPeriodBy, customerfilterBy) => {

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
  let totalAmount = {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ["$line_items.isCredit", true] },
          ]
        }, { $multiply: [{ '$toInt': "$line_items.amount" }, -1] }, { '$toInt': "$line_items.amount" },
      ],
    },
  }

  /**
   * other filters
   */
  let matchJE = {
    $expr: {
      $and: [
        { $eq: ["$line_items.account", "$$accountid"] }
      ],
    },
  }
  if (customerfilterBy != "none") {
    matchJE.$expr.$and.push({ $in: ["$line_items.customer", customerfilterBy] })
  }
  /**
   * end other filters
   */

  /**
   * date group
   */
  let groupJE = {
    $group: {
      _id: null,
      creditSum: totalCredit,
      debitSum: totalDebit,
      totalSum: totalAmount,
    }
  }
  if (reportPeriodBy == "month") {
    groupJE = {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        creditSum: totalCredit,
        debitSum: totalDebit,
        totalSum: totalAmount,
      }
    }
  } else if (reportPeriodBy == "year") {
    groupJE = {
      $group: {
        _id: { year: { $year: "$createdAt" } },
        creditSum: totalCredit,
        debitSum: totalDebit,
        totalSum: totalAmount,
      }
    }
  }
  /**
   * end date group
   */

  let je_lookup = {
    $lookup: {
      from: "journal_entries",
      let: {
        accountid: "$_id"
      },
      pipeline: [
        {
          $match: {
            createdAt: { $gte: from_date, $lte: to_date },
            company: { $in: companyIds }
          }
        },
        {
          $unwind: "$line_items"
        },
        {
          $match: matchJE

        },
        groupJE,
        {
          $sort: { "_id.month": 1 }
        }
      ],
      as: "JE",
    },
  }
  let company_lookup = {
    $lookup: {
      from: "companies",
      let: {
        companyid: "$company"
      },
      pipeline: [       
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$_id", "$$companyid"] }
              ],
            },
          }
        }
      ],
      as: "Comp",
    },
  }
  const balance_sheet = await Account.aggregate([
    {
      $addFields: { amount: 0, id: { $toString: "$_id" }, parentID: { $toString: "$parent_account_id" }, }
    },
    {
      $match: filter,
    },
    {
      $match : { company: { $in: companyIds }}
    },
    je_lookup,
    company_lookup,
    {$unwind : "$Comp"},
    {
      $project: {
        _id: 1,
        id: 1,
        is_balance_sheet: 1,
        details_type: 1,
        parent_account_name: 1,
        parent_account_id: 1,
        parentID: 1,
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

const getProfitLoss = async (filter, from_date, to_date, companyIds, reportPeriodBy, customerfilterBy) => {
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
  let totalAmount = {
    $sum: {
      $cond: [
        {
          $and: [
            { $eq: ["$line_items.isCredit", true] },
          ]
        }, { $multiply: [{ '$toInt': "$line_items.amount" }, -1] }, { '$toInt': "$line_items.amount" },
      ],
    },
  }
  /**
   * other filters
   */
  let matchJE = {
    $expr: {
      $and: [
        { $eq: ["$line_items.account", "$$accountid"] }
      ],
    },
  }
  if (customerfilterBy != "none") {
    matchJE.$expr.$and.push({ $in: ["$line_items.customer", customerfilterBy] })
  }
  /**
   * end other filters
   */

  /**
   * date group
   */
  let groupJE = {
    $group: {
      _id: null,
      creditSum: totalCredit,
      debitSum: totalDebit,
      totalSum: totalAmount,
    }
  }
  if (reportPeriodBy == "month") {
    groupJE = {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        creditSum: totalCredit,
        debitSum: totalDebit,
        totalSum: totalAmount,
      }
    }
  } else if (reportPeriodBy == "year") {
    groupJE = {
      $group: {
        _id: { year: { $year: "$createdAt" } },
        creditSum: totalCredit,
        debitSum: totalDebit,
        totalSum: totalAmount,
      }
    }
  }
  /**
   * end date group
   */
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
            createdAt: { $gte: from_date, $lte: to_date }
          }
        },
        {
          $unwind: "$line_items"
        },
        {
          $match: matchJE

        },
        groupJE,
      ],
      as: "JE",
    },
  }
  let company_lookup = {
    $lookup: {
      from: "companies",
      let: {
        companyid: "$company"
      },
      pipeline: [       
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$_id", "$$companyid"] }
              ],
            },
          }
        }
      ],
      as: "Comp",
    },
  }
  const profit_loss = await Account.aggregate([
    {
      $addFields: { amount: 0, id: { $toString: "$_id" }, parentID: { $toString: "$parent_account_id" }, }
    },
    {
      $match: filter,
    },
    {
      $match : { company: { $in: companyIds }}
    },
    je_lookup,
    company_lookup,
    { $unwind : "$Comp"},
    {
      $project: {
        _id: 1,
        id: 1,
        is_balance_sheet: 1,
        details_type: 1,
        parent_account_id: 1,
        parentID: 1,
        parent_account_name: 1,
        uid_number: 1,
        name:1,
        account_type: 1,
        code: 1,
        company: 1,
        JE: "$JE",
        Comp:"$Comp.company_name",
        amount: 1,
      },
    },
    {
      $sort: { created_at: 1 },
    },
  ]);
  return { profit_loss };
};

const getVatReport = async (filter, from_date, to_date, companyIds, isCredit, typeTaxData) => {

  /**
   * other filters
   */
  let matchJE = {
    $expr: {
      $and: [
        { $eq: [{$toObjectId : "$tax_item.account"}, "$$accountid"] },
        { $eq: ["$tax_item.isCredit",isCredit ]}
      ],
    },
  }

if(isCredit && typeTaxData == "INVAT"){
  matchJE.$expr.$and.push({ $eq: ["$tax_item.taxName", "INVAT"] })

}else if(isCredit && typeTaxData != "INVAT"){
  matchJE.$expr.$and.push({ $ne: ["$tax_item.taxName", "INVAT"] })

}
  /**
   * end other filters
   */

  /**
   * date group
   */
  let groupJE = {}
  if(isCredit && typeTaxData == "INVAT"){
    groupJE = {
      $group: {
        _id: { typeTax : "$tax_item.taxName" , city : "$tax_item.city" },
        netAmountSum:{ $sum: { $toInt : "$tax_item.netAmount"}},
        vatAmountSum: { $sum: { $toInt : "$tax_item.taxAmount"}},
        totalAmountSum: { $sum: { $toInt : "$tax_item.totalAmount"}},
      }
    }
  }else if(isCredit && typeTaxData != "INVAT"){
    groupJE = {
      $group: {
        _id: { typeTax : "$tax_item.taxName"  },
        netAmountSum:{ $sum: { $toInt : "$tax_item.netAmount"}},
        vatAmountSum: { $sum: { $toInt : "$tax_item.taxAmount"}},
        totalAmountSum: { $sum: { $toInt : "$tax_item.totalAmount"}},
      }
    }
  }
  

  if (!isCredit){
    groupJE = {
      $group: {
        _id: { typeTax :"$tax_item.taxName"},
        netAmountSum:{ $sum: { $toInt : "$tax_item.netAmount"}},
        vatAmountSum: { $sum: { $toInt : "$tax_item.taxAmount"}},
        totalAmountSum: { $sum: { $toInt : "$tax_item.totalAmount"}},
      }
    }
  }
  console.log(groupJE,"------------------groupJE",isCredit)

  /**
   * end date group
   */

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
            company: { $in: companyIds },
            is_deleted : 0,
          }
        },
        {
          $unwind: "$tax_item"
        },
        {
          $match: matchJE
        },
        groupJE,
      ],
      as: "JE",
    },
  }

  /**Group Condition */
  let taxGroup = { $sort : { typeTax : -1} }
  if (!isCredit){
    taxGroup = { $group : {
      _id: "$parent_account_id",
      totalAmount : { $sum : "$totalAmount"},
      vatAmount : { $sum : "$vatAmount"},
      netAmount : { $sum : "$netAmount"}
    }}
  }

  const vat_report = await Account.aggregate([

    {
      $match: filter,
    },
    je_lookup,
    {
      $unwind : "$JE"
    },
    {
      $project: {
        // _id: 1,
        // id: 1,
        // is_balance_sheet: 1,
        // details_type: 1,
        parent_account_name: 1,
        parent_account_id: 1,
        // parentID: 1,
        // uid_number: 1,
        name: 1,
        // account_type: 1,
        je:"$JE",
        code: 1,
        company: 1,
        city:1,
        typeTax: "$JE._id.typeTax",
        totalAmount : "$JE.totalAmountSum",
        vatAmount : "$JE.vatAmountSum",
        netAmount : "$JE.netAmountSum"
      },
    },
    taxGroup
    // {
    //   $group : taxGroup
    // }
    // {
    //   $sort: { "level1": 1 },
    // },
  ]);
  return { vat_report };
};

const getVatReportDetails = async (filter, from_date, to_date, companyIds, isCredit, typeTaxData, cityData) => {

  /**
   * other filters
   */
  let matchJE = {
    $expr: {
      $and: [
        { $eq: [{$toObjectId : "$tax_item.account"}, "$$accountid"] },
        { $eq: ["$tax_item.isCredit",isCredit ]}
      ],
    },
  }

if(isCredit && typeTaxData == "INVAT"){
  matchJE.$expr.$and.push({ $eq: ["$tax_item.taxName", "INVAT"] })
  matchJE.$expr.$and.push({ $eq: ["$tax_item.city", cityData] })

}else if(isCredit && typeTaxData != "INVAT"){
  matchJE.$expr.$and.push({ $ne: ["$tax_item.taxName", "INVAT"] })

}
  /**
   * end other filters
   */

  /**
   * date group
   */
  let groupJE = {}
  if(isCredit && typeTaxData == "INVAT"){
    groupJE = {
      $group: {
        _id: { typeTax : "$tax_item.taxName" , city : "$tax_item.city" },
        netAmountSum:{ $sum: { $toInt : "$tax_item.netAmount"}},
        vatAmountSum: { $sum: { $toInt : "$tax_item.taxAmount"}},
        totalAmountSum: { $sum: { $toInt : "$tax_item.totalAmount"}},
      }
    }
  }else if(isCredit && typeTaxData != "INVAT"){
    groupJE = {
      $group: {
        _id: { typeTax : "$tax_item.taxName"  },
        netAmountSum:{ $sum: { $toInt : "$tax_item.netAmount"}},
        vatAmountSum: { $sum: { $toInt : "$tax_item.taxAmount"}},
        totalAmountSum: { $sum: { $toInt : "$tax_item.totalAmount"}},
      }
    }
  }
  

  if (!isCredit){
    groupJE = {
      $group: {
        _id: { typeTax :"$tax_item.taxName"},
        netAmountSum:{ $sum: { $toInt : "$tax_item.netAmount"}},
        vatAmountSum: { $sum: { $toInt : "$tax_item.taxAmount"}},
        totalAmountSum: { $sum: { $toInt : "$tax_item.totalAmount"}},
      }
    }
  }
  console.log(groupJE,"------------------groupJE",isCredit)

  /**
   * end date group
   */

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
            company: { $in: companyIds },
            is_deleted : 0,
          }
        },
        {
          $unwind: "$tax_item"
        },
        {
          $match: matchJE
        },
        // groupJE,
      ],
      as: "JE",
    },
  }

  // /**Group Condition */
  // let taxGroup = { $sort : { typeTax : -1} }
  // if (!isCredit){
  //   taxGroup = { $group : {
  //     _id: "$parent_account_id",
  //     totalAmount : { $sum : "$totalAmount"},
  //     vatAmount : { $sum : "$vatAmount"},
  //     netAmount : { $sum : "$netAmount"}
  //   }}
  // }

  const vat_report = await Account.aggregate([
    {
      $match: filter,
    },
    je_lookup,
    {
      $unwind : "$JE"
    },
    {
      $project: {
        // _id: 1,
        // id: 1,
        // is_balance_sheet: 1,
        // details_type: 1,
        parent_account_name: 1,
        parent_account_id: 1,
        // parentID: 1,
        // uid_number: 1,
        name: 1,
        // account_type: 1,
        je:"$JE",
        code: 1,
        company: 1,
        city:1,
        typeTax: "$JE._id.typeTax",
        totalAmount : "$JE.totalAmountSum",
        vatAmount : "$JE.vatAmountSum",
        netAmount : "$JE.netAmountSum"
      },
    },
    // taxGroup
    // {
    //   $group : taxGroup
    // }
    // {
    //   $sort: { "level1": 1 },
    // },
  ]);
  return { vat_report };
};

module.exports = {
  getTrailBalance,
  getAccountTransactionDetails,
  getBalanceSheet,
  getProfitLoss,
  getVatReport,
  getVatReportDetails
};
