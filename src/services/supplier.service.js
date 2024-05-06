const { Supplier } = require('../models');
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
 * Create a supplier
 * @param {Object} body
 * @returns {Promise<Supplier>}
 */
const createSupplier = async (body) => {
  const supplier = await Supplier.create({...body,company:ObjectId(body.company)});
  return { supplier };
};

/**
 * Query for suppliers
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Supplier>}
 */

const querySupplier = async (filter,search, limit,pageNo) => {
  var nPerPage = parseInt(limit)
  var page=parseInt(pageNo)
  var filterField = {
    $and: [{
      is_deleted: 0
    }]
  };
  const initialAggregateArray = [{
    $match: filter
  }];

  if (search) {
    filterField.$and.push({
      $or: [{
        company_name: {
            $regex: '.*' + search + '.*',
            $options: 'i'
          }
        },
        {
            supplier_id: {
            $regex: '.*' + search + '.*',
            $options: 'i'
          }
        },
        {
            bank_account: {
            $regex: '.*' + search + '.*',
            $options: 'i'
          }
        },
      ],
    });
    initialAggregateArray[1] = {
      $match: filterField
    };
  }
  const filteredFieldArray = [{
    $project: {
      updatedAt: 0,
      createdAt: 0,
      __v: 0
    }
  }, {
    $sort: {
      created_at: 1
    },
  },
  {$skip:page==0?page:page*nPerPage},
  {$limit: nPerPage}
  ];
  const aggregateArray = [...initialAggregateArray, ...filteredFieldArray];
  const suppliers = await Supplier.aggregate(aggregateArray);
  const total_count = await Supplier.find(filterField).count()
  const total_page = Math.ceil(total_count / nPerPage);
  return {
    suppliers,
    total_count,
    total_page
  };
};

/**
 * Get for supplier by id
 * @param {number} id
 * @returns {Promise<Supplier>}
 */
const getSupplierById = async (id) => {
  const supplier = await Supplier.findById(id);
  return supplier;
};

/**
 * Update suppliers by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Supplier>}
 */
const updateSupplierById = async (id, updateBody) => {
  const supplier = await getSupplierById(id);
  if (!supplier) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(supplier, updateBody);
  await supplier.save();
  return supplier;
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
                company_name: formatted['Company Name'],
                primary_contact: {
                  first_name: formatted['Primary Contact First Name'],
                  middle_name: formatted['Primary Contact Middle Name'],
                  last_name: formatted['Primary Contact Last Name'],
                },
                company: formatted['Company'],
                nick_name: formatted['Nick Name'],
                supplier_id: formatted['Supplier'],
                email: formatted['Email'],
                phone: formatted['Phone'],
                website: formatted['Website'],
                trn_number: formatted['TRN'],
                mobile: formatted['Mobile'],
                fax: formatted['Fax'],
                bank_account: formatted['Bank Account'],
                address: formatted['Address']
              }
              temp.push(item)
          }

          if(i === array.length - 1) {
              resolve(temp)
          }
      });
  });
}

/*** bulk upload supplier***/
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
    var duplicateSupplier = [];
    var supplierList = [];
    if (items.length) {
      for (let i = 0; i < items.length; i++) {
        const info = items[i];
        const existing = await Supplier.findOne({ bank_account: info.bank_account });
        if (existing) {
          duplicateSupplier.push(items[i].code);
        } else {
          supplierList.push(items[i]);
        }
      }
    }
    console.log(supplierList)
    if (supplierList.length) {
      try {
        const insertedCostCenterList = await Supplier.insertMany(supplierList, { ordered: false });
        if (insertedCostCenterList.length) {
          result.message = `Successfully Added ${supplierList.length} entries`;
        } else {
          result.error = true;
        }
      } catch (error) {
        result.message = `Error adding entries: ${error}`;
      }
    }
    if (duplicateSupplier.length) {
      result.error = {
        supplier: duplicateSupplier,
      };
    }
    return result;
  } catch (error) {
    return {
      message: error.message,
    };
  }
};

;

/**
 * Export suppliers 
 */
const exportSupplier = async (req, id) => {
  const {type,company}=req
  const companyIds = company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const s3 = new AWS.S3({
    accessKeyId: process.env.SECRET_ID_AWS,
    secretAccessKey: process.env.SECRET_KEY_AWS,
  });
  const cost_center = await Supplier.aggregate([
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
        createdAt: 0,
        updatedAt: 0,
        is_deleted: 0,
        status:0
      },
    },
    {
      $lookup: {
        from: "companies",
        let: {
          companyId: "$company",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", "$$companyId"],
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
        as: "companyInfo",
      },
    },
    {
      $addFields: {
        company: {
          $arrayElemAt: ["$companyInfo", 0],
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
        company: "$company.company_name", // output only the company name
        company_name: 1,
        primary_contact: 1,
        bank_account: 1,
      },
    },

  ]);

  if (type == 'xlsx') {
    const sheet = XLSX.utils.json_to_sheet(cost_center);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const currentDate = moment().format('YYYYMMDDHHmmssSSS');
    const fileName = `supplier-${id}-${currentDate}`;
    const buffer = XLSX.write(workbook, { type: 'buffer' });

    const params = {
      Bucket: process.env.BUCKET_NAME + '/supplier',
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
    const fileName = `supplier-${id}-${currentDate}.csv`;
    const writer = csv.createObjectCsvWriter({
      path: fileName,
      header: [
        { id: 'company_name', title: 'Name' },
        { id: 'company', title: 'company' },
        { id: 'primary_contact', title: 'Contact' },
        { id: 'bank_account', title: 'Bank Account' },
      ],
    });
    try {
      await writer.writeRecords(cost_center);
      const buffer = await fs.promises.readFile(fileName);
      const params = {
        Bucket: process.env.BUCKET_NAME + '/supplier',
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
    const sheet = XLSX.utils.json_to_sheet(cost_center);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

    const currentDate = moment().format('YYYYMMDDHHmmssSSS');
    const fileName = `supplier-${id}-${currentDate}.xls`;

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xls' });
    const params = {
      Bucket: process.env.BUCKET_NAME + '/supplier',
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
 * Get  Supplier list for drop down
 * @returns {Promise<Supplier>}
 */
const getSupplierList = async (filter) => {
  const suppliers = await Supplier.aggregate([
    {
      $addFields : { category : "supplier"}
    },
    {
      $match: filter,
    },
    {
      $sort: { created_at: 1 },
    },
    {
      $project: {
        _id: 1,
        company_name: 1,
        category : 1,
      },
    },
  ]);

  return { suppliers };
};

/**
 * Get chart of account list for drop down
 * @returns {Promise<ChartOfAccounts>}
 */
const getSupplierDropDownList = async (filter) => {
  const supplier = await Supplier.aggregate([
    {
      $match: filter,
    },
    {
      $sort: { created_at: 1 },
    },
    {
      $project: {
        _id: 1,
        company_name: 1,
      },
    },
  ]);

  return { supplier };
};

module.exports = {
  createSupplier,
  updateSupplierById,
  querySupplier,
  bulkUpload,
  exportSupplier,
  getSupplierById,
  getSupplierList,
  getSupplierDropDownList
};
