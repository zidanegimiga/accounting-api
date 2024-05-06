const { AccountConfiguration,Account } = require('../models');
const XLSX = require('xlsx');
const excelReader = require('../helpers/excel-reader');


/**
 * Create a account configuration
 * @param {Object} body
 * @returns {Promise<AccountConfiguration>}
 */
const createAccountConfig = async (body) => {
  const accountConfig = await AccountConfiguration.create(body);
  return { accountConfig };
};

/*** Get data function for bulk upload***/
const getData = (data) => {
  const header = data[0];
  return new Promise((resolve) => {
      const temp = []
      const accountData = data.filter(item => item.length > 0)
      accountData.forEach(async (row, i, array) => {
          if(i > 0 && row.length > 0) {
              const formatted = await excelReader.formatRow(row, header)
              const item = {
                  name: formatted['Name'],
                  isBalanceSheet: formatted.Section,
                  isDebitAccount:formatted['Debit Account Type'],
                  trialBalanceDebitType: formatted['Debit Trial Balance Type'],
                  isReportValuePositive: formatted['Balance Sheet Sign'],
                  parentId:formatted['Parent'],
                  accountType:formatted['Account Type'],
                  detailType:formatted['Detail Type']
              }
              temp.push(item)
          }

          if(i === array.length - 1) {
              resolve(temp)
          }
      });
  });
}

/*** bulk upload cost center***/
const bulkUpload = async (req) => {
  var result = { message: null, error: null };
  try {
    const filename = req.files.file.tempFilePath;
    const workbook = XLSX.readFile(filename);
    const worksheet = workbook.Sheets.Sheet1;
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    });
    const items = await getData(data);
    var duplicateAccountConfig = [];
    var accountConfigList = [];
    if (items.length) {
      for (let i = 0; i < items.length; i++) {
        const info = items[i];
        const existing = await AccountConfiguration.findOne({ name: info.name });
        if (existing) {
          duplicateAccountConfig.push(items[i].code);
        } else {
          accountConfigList.push(items[i]);
        }
      }
    }
    if (accountConfigList.length) {
      try {
        const insertedAccountConfigList = await AccountConfiguration.insertMany(accountConfigList, { ordered: false });
        if (insertedAccountConfigList.length) {
          result.message = `Successfully Added ${accountConfigList.length} entries`;
        } else {
          result.error = true;
        }
      } catch (error) {
        result.message = `Error adding entries: ${error}`;
      }
    }
    if (duplicateAccountConfig.length) {
      result.error = {
        accountConfig: duplicateAccountConfig,
      };
    }
    return result;
  } catch (error) {
    return {
      message: error.message,
    };
  }
};

/**
 * Create standard account
 * @param {Object} body
 * @returns {Promise<Account>}
 */
const createStandardAccount = async (body) => {
  const accounts = await Account.create(body);
  return { accounts };
};

/**
 * get sub type AccountConfiguration
 * @param {Object} body
 * @returns {Promise<AccountConfiguration>}
 */
const getSubTypeCloneAccount = async (filter) => {

  const accounts = await AccountConfiguration.aggregate([
    {
      $match: filter
    },
    {
      $lookup: {
        from: "account_configurators",
        localField: "parent_account_id",
        foreignField: "_id",
        as: "parent_account"
      }
    },
    {
      $lookup: {
        from: "account_configurators",
        localField: "parent_account.parent_account_id",
        foreignField: "_id",
        as: "grandparent_account"
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        parent_account_id: 1,
        is_balance_sheet: 1,
        code: 1,
        parentCode: { $arrayElemAt: ["$parent_account.code", 0] },
        baseCode: { $arrayElemAt: ["$grandparent_account.code", 0] },
        standard_code:1
      }
    }
  ]);  
  return accounts;
};



/**
 * Get chart of account list for drop down
 * @returns {Promise<ChartOfAccounts>}
 */
const getAccountConfigList = async (filter) => {
  const accounts = await AccountConfiguration.aggregate([
    {
      $addFields : { id : { $toString: "$_id" }, parentID : { $toString: "$parent_account_id" },}
    },
    {
      $match: filter,
    },
  ]);

  return { accounts };
};



module.exports = {
  createAccountConfig,
  bulkUpload,
  createStandardAccount,
  getSubTypeCloneAccount,
  getAccountConfigList 
};
