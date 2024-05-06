const { Account, AccountConfiguration } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const excelReader = require('../helpers/excel-reader');
const XLSX = require('xlsx');
const AWS = require('aws-sdk');
const moment = require('moment');
const csv = require('csv-writer');
const fs = require('fs');
const { array } = require('joi');
const { ObjectId } = require('mongodb');
/**
 * Create a chart of account
 * @param {Object} body
 * @returns {Promise<ChartOfAccounts>}
 */
const createChartOfAccount = async (body) => {
  const account = await Account.create(body);
  return {
    account,
  };
};

const getMonthList = () => {
  let givenDateTime = '2022-01-01T04:22:22.148Z';
  let createdDate = new Date(givenDateTime);
  createdDate.setDate(1);
  let currentDate = new Date();
  let dateAndYearList = [
    createdDate.toLocaleString('en', {
      month: 'long',
      year: 'numeric',
    }),
  ];
  while (createdDate.setMonth(createdDate.getMonth() + 1) < currentDate) {
    dateAndYearList.unshift(
      createdDate.toLocaleString('en', {
        month: 'long',
        year: 'numeric',
      })
    );
  }
  return dateAndYearList;
};

/**
 * Query for chart of accounts
 * @param {Object} filter - Mongo filter
 * @returns {Promise<ChartOfAccounts>}
 */

const queryAccounts = async (filter, search, limit, pageNo) => {
  var nPerPage = parseInt(limit);
  var page = parseInt(pageNo);
  var filterField = {
    $and: [
      {
        is_deleted: 0,
      },
    ],
  };

  const initialAggregateArray = [
    {
      $match: filter,
    },
    {
      $lookup: {
        from: 'account_configurators',
        let: {
          account_type: '$account_type',
          details_type: '$details_type',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ['$_id', ['$$account_type', '$$details_type']],
              },
            },
          },
          {
            $project: {
              name: 1,
              _id: 1, // exclude the company id
            },
          },
        ],
        as: 'TypeInfo',
      },
    },
  ];

  if (search) {
    filterField.$and.push({
      $or: [
        {
          name: {
            $regex: '.*' + search + '.*',
            $options: 'i',
          },
        },
        // {
        //   account_type: {
        //     $regex: '.*' + search + '.*',
        //     $options: 'i',
        //   },
        // },
        // {
        //   details_type: {
        //     $regex: '.*' + search + '.*',
        //     $options: 'i',
        //   },
        // },
        // {
        //   'sub_account.parent_account': {
        //     $regex: '.*' + search + '.*',
        //     $options: 'i',
        //   },
        // },
        // {
        //   tax_code: {
        //     $regex: '.*' + search + '.*',
        //     $options: 'i',
        //   },
        // },
      ],
    });
    initialAggregateArray[2] = {
      $match: filterField,
    };
  }

  const filteredFieldArray = [
    {
      $project: {
        updated_at: 0,
        created_at: 0,
        __v: 0,
      },
    },
    {
      $project: {
        account_type: {
          $arrayElemAt: [
            { $filter: { input: '$TypeInfo', as: 'path', cond: { $eq: ['$$path._id', "$account_type"] } } },
            0
          ]
        },
        details_type: {
          $arrayElemAt: [
            { $filter: { input: '$TypeInfo', as: 'path', cond: { $eq: ['$$path._id', "$details_type"] } } },
            0
          ]
        },
        name:1,
        status:1,
        account_id:1
      },
    },
    {
      $sort: {
        name: 1,
      },
    },
    { $skip: page == 0 ? page : page * nPerPage },
    { $limit: nPerPage }
  ];
  const aggregateArray = [...initialAggregateArray, ...filteredFieldArray];

  const accounts = await Account.aggregate(aggregateArray);
  const total_count = await Account.find(filter).count();
  const total_page = Math.ceil(total_count / nPerPage);
  return {
    accounts,
    total_count,
    total_page,
  };
};

/**
 * Get for chart of account by id
 * @param {number} id
 * @returns {Promise<ChartOfAccounts>}
 */
const getAccountById = async (id) => {
  const account = await Account.findById(id);
  return account;
};

/**
 * Update chart of account by id
 *
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<ChartOfAccounts>}
 */
const updateAccountById = async (id, updateBody) => {
  const account = await getAccountById(id);
  if (!account) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(account, updateBody);
  await account.save();
  return account;
};

/**
 * Get for chart of account by id
 * @param {number} id
 * @returns {Promise<ChartOfAccounts>}
 */
const getAccountByUid = async (uid_number) => {
  return await Account.findOne({
    uid_number,
  });
};

/*** Get data function for bulk upload***/
const getData = (data) => {
  const header = data[0];
  return new Promise((resolve) => {
    const temp = [];
    const accountData = data.filter((item) => item.length > 0);
    // console.log(accountData)
    accountData.forEach(async (row, i, array) => {
      if (i > 0 && row.length > 0) {
        const formatted = await excelReader.formatRow(row, header);
        const item = {
          name: formatted['Account Name'],
          uid_number: formatted['Account Code'],
          account_type: formatted['Account Type'],
          details_type: formatted['Details Type'],
          description: formatted['Description'],
          status: formatted['Status'],
          code: formatted['Code'],
          company: formatted['Company'],
          is_balance_sheet: formatted['Balance Sheet'],
          locked: formatted['Locked'],
          level1: formatted['Level 1'],
          level2: formatted['Level 2'],
          level3: formatted['Level 3'],
        };
        temp.push(item);
      }

      if (i === array.length - 1) {
        resolve(temp);
      }
    });
  });
};

/*** bulk upload chart of account***/
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
    var duplicateAccounts = [];
    var accountList = [];
    if (items.length) {
      for (let i = 0; i < items.length; i++) {
        const info = items[i];
        const existing = await Account.findOne({ uid_number: info.uid_number });
        if (existing) {
          duplicateAccounts.push(items[i].uid_number);
        } else {
          accountList.push(items[i]);
        }
      }
    }
    if (accountList.length) {
      try {
        const insertedAccountList = await Account.insertMany(accountList, { ordered: false });
        if (insertedAccountList.length) {
          result.message = `Successfully Added ${accountList.length} entries`;
        } else {
          result.error = true;
        }
        // await Account.insertMany(accountList, { ordered: false });
        // result.message = `Successfully Added ${accountList.length} entries`;
      } catch (error) {
        result.message = `Error adding entries: ${error}`;
      }
    }
    if (duplicateAccounts.length) {
      result.error = {
        accounts: duplicateAccounts,
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
 * Delete chart of account by id
 * @param {ObjectId} Id
 * @returns {Promise<ChartOfAccounts>}
 */
const deleteAccount = async (id) => {
  const account = await getAccountById(id);
  if (!account) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  account.is_deleted = 1;
  await account.save();
  return account;
};

/**
 * Get chart of account list for drop down
 * @returns {Promise<ChartOfAccounts>}
 */
const getAccountList = async (filter) => {
  const accounts = await Account.aggregate([
    {
      $match: filter,
    },
    {
      $sort: { name: 1 },
    },
    {
      $project: {
        _id: 1,
        name: 1,
      },
    },
  ]);

  return { accounts };
};

/**
 * Export chart of account
 */
const exportAccount = async (req, id) => {
  const { type, company } = req;
  const companyIds = company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0, company: { $in: companyIds } };
  const s3 = new AWS.S3({
    accessKeyId: process.env.SECRET_ID_AWS,
    secretAccessKey: process.env.SECRET_KEY_AWS,
  });
  const accounts = await Account.aggregate([
    {
      $match: filter,
    },
    {
      $sort: { created_at: 1 },
    },
    {
      $project: {
        _id: 0,
        __v: 0,
        created_at: 0,
        updated_at: 0,
        is_deleted: 0,
      },
    },
    {
      $lookup: {
        from: 'companies',
        let: {
          companyId: '$company',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ['$_id', '$$companyId'],
              },
            },
          },
          {
            $project: {
              company_name: 1,
              _id: 0, // exclude the company id
            },
          },
        ],
        as: 'companyInfo',
      },
    },
    {
      $addFields: {
        company: {
          $arrayElemAt: ['$companyInfo', 0],
        },
      },
    },
    {
      $project: {
        companyInfo: 0,
      },
    },
    {
      $project: {
        company: '$company.company_name', // output only the company name
        name: 1,
        uid_number: 1,
        account_type: 1,
        code: 1,
        details_type: 1,
        is_balance_sheet: 1,
        level1: 1,
        level2: 1,
        level3: 1,
      },
    },
  ]);

  if (type == 'xlsx') {
    const sheet = XLSX.utils.json_to_sheet(accounts);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const currentDate = moment().format('YYYYMMDDHHmmssSSS');
    const fileName = `account-${id}-${currentDate}`;
    const buffer = XLSX.write(workbook, { type: 'buffer' });

    const params = {
      Bucket: process.env.BUCKET_NAME + '/accounts',
      Key: `${fileName}.xlsx`,
      Body: buffer,
      ACL: 'public-read',
    };

    try {
      const result = await s3.upload(params).promise();
      return result.Location;
    } catch (err) {
      throw new ApiError(httpStatus.NOT_FOUND, err);
    }
  } else if (type == 'csv') {
    const currentDate = moment().format('YYYYMMDDHHmmssSSS');
    const fileName = `account-${id}-${currentDate}.csv`;
    const writer = csv.createObjectCsvWriter({
      path: fileName,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'uid_number', title: 'UID' },
        { id: 'account_type', title: 'Account Type' },
        { id: 'uid_number', title: 'UID' },
        { id: 'details_type', title: 'Details Type' },
        { id: 'description', title: 'Description' },
        { id: 'company', title: 'Company' },
        { id: 'is_balance_sheet', title: 'Balance Sheet' },
        { id: 'level1', title: 'Level 1' },
        { id: 'level2', title: 'Level 2' },
        { id: 'level3', title: 'Level 3' },
      ],
    });
    try {
      await writer.writeRecords(accounts);
      const buffer = await fs.promises.readFile(fileName);
      const params = {
        Bucket: process.env.BUCKET_NAME + '/accounts',
        Key: fileName,
        Body: buffer,
        ACL: 'public-read',
        ContentType: 'text/csv',
      };

      try {
        const result = await s3.upload(params).promise();
        fs.rmSync(`./${fileName}`, {
          force: true,
        });
        return result.Location;
      } catch (err) {
        throw new ApiError(httpStatus.NOT_FOUND, err);
      }
    } catch (err) {
      throw new ApiError(httpStatus.NOT_FOUND, err);
    }
  }
  if (type == 'xls') {
    const sheet = XLSX.utils.json_to_sheet(accounts);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

    const currentDate = moment().format('YYYYMMDDHHmmssSSS');
    const fileName = `account-${id}-${currentDate}.xls`;

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xls' });
    const params = {
      Bucket: process.env.BUCKET_NAME + '/accounts',
      Key: fileName,
      Body: buffer,
      ACL: 'public-read',
      ContentType: 'application/vnd.ms-excel',
    };

    try {
      const result = await s3.upload(params).promise();
      return result.Location;
    } catch (err) {
      throw new ApiError(httpStatus.NOT_FOUND, err);
    }
  }
};

/**
 * Query for configuration account page
 */

const getAccountConfig = async (filter) => {
  const filter1 = { is_deleted: 0, accountType: true };
  const filter2 = { is_deleted: 0, detailType: true };

  const accounts = await AccountConfiguration.find(filter1);

  const result = [];

  for (const account of accounts) {
    const children = await AccountConfiguration.find({ ...filter2, parent_account_id: account._id });

    result.push({
      AccountType: account.name,
      id: account._id,
      is_balance_sheet: account.is_balance_sheet,
      DetailType: children.map((child) => ({
        id: child._id,
        name: child.name,
      })),
    });
  }
  return result;
};

/**
 * Get for chart of account by code
 * @param {number} id
 * @returns {Promise<ChartOfAccounts>}
 */
const getAccountByCode = async (filter) => {
  const result = await Account.findOne(filter,{ _id: 1, name: 1 });
  return result;
};


/**
 * Get for chart of account list for level1
 * @param {number} id
 * @returns {Promise<ChartOfAccounts>}
 */
const getLevel1AccountList = async (filter) => {
  const result = await Account.aggregate([
    {
      $match: filter,
    },
    {
      $project: {
        _id: 1,
        name: 1,
      },
    },
  ]);
  return result;
};

/**
 * Get for chart of account by code
 * @param {number} id
 * @returns {Promise<ChartOfAccounts>}
 */
const getAccountByFilter = async (filter) => {
  const result = await Account.findOne(filter);
  let count=0
  if(result){
   count = await Account.countDocuments({ parent_account_id: result.id, is_deleted: 0 })
  }
  return { account: result, count: count + 1 };
};


/**
 * Query for Last Account by Parent Id
 * @param {Object} filter - Mongo filter
 * @returns {Promise<ChartOfAccounts>}
 */
const getLastAccountByParentId = async (filter) => {
  const latestDoc = await Account.aggregate([
    {
      $match: filter,
    },
    {
      $project: {
        _id: 1,
        account_id: 1
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


module.exports = {
  createChartOfAccount,
  updateAccountById,
  queryAccounts,
  getAccountByUid,
  bulkUpload,
  deleteAccount,
  getAccountList,
  exportAccount,
  getAccountConfig,
  getAccountByCode,
  getAccountById,
  getLevel1AccountList,
  getAccountByFilter,
  getLastAccountByParentId
};
