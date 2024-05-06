const { TaxCode } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const excelReader = require('../helpers/excel-reader');
const XLSX = require('xlsx');

/**
 * Create a Tax Code
 * @param {Object} body
 * @returns {Promise<TaxCodes>}
 */
const createTaxCode = async (body) => {
  const taxCode = await TaxCode.create(body);
  return { taxCode };
};

/**
 * Query for tax codes
 * @param {Object} filter - Mongo filter
 * @returns {Promise<TaxCodes>}
 */

const queryTaxCodes = async (filter,search, limit,pageNo) => {
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
          name: {
            $regex: '.*' + search + '.*',
            $options: 'i'
          }
        },
        {
          code: {
            $regex: '.*' + search + '.*',
            $options: 'i'
          }
        },
        // {
        //   rate: {
        //     $regex: '.*' + search + '.*',
        //     $options: 'i'
        //   }
        // },
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
  const taxCodes = await TaxCode.aggregate(aggregateArray);
  const total_count = await TaxCode.find(filterField).count()
  const total_page = Math.ceil(total_count / nPerPage);
  return {
    taxCodes,
    total_count,
    total_page
  };
};

/**
 * Get for tax code by id
 * @param {number} id
 * @returns {Promise<TaxCodes>}
 */
const getTaxCodeById = async (id) => {
  const taxCode = await TaxCode.findById(id);
  return taxCode;
};

/**
 * Update tax code by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<TaxCodes>}
 */
const updateTaxCodeById = async (id, updateBody) => {
  const taxCode = await getTaxCodeById(id);
  if (!taxCode) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(taxCode, updateBody);
  await taxCode.save();
  return taxCode;
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
                  name: formatted.name,
                  code: formatted.code,
                  rate:formatted.rate
              }
              temp.push(item)
          }

          if(i === array.length - 1) {
              resolve(temp)
          }
      });
  });
}

/*** bulk upload tax code***/
const bulkUpload = async (req) => {
  try {
    const filename = req.files.file.tempFilePath;
    const workbook = XLSX.readFile(filename);
    const worksheet = workbook.Sheets.Sheet1;
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const items = await getData(data);

    const savePromise = new Promise((resolve) => {
      if (items.length) {
        items.forEach(async (info) => {
          const taxCode = new TaxCode({
            name: info.name,
            code: info.code,
            rate:info.rate,
          });
          await taxCode.save();
        });
      }
    });

    savePromise.then(() => {
      return({ message: 'Successfully Added' });
    });
  } catch (error) {
    return { message: error.message };
  }
};

/**
 * Delete tax code by id
 * @param {ObjectId} Id
 * @returns {Promise<TaxCodes>}
 */
const deleteTaxCode = async (id) => {
  const taxCode = await getTaxCodeById(id);
  if (!taxCode) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  taxCode.is_deleted = 1;
  await taxCode.save();
  return taxCode;
};

/**
 * Get tax code list for drop down
 * @returns {Promise<TaxCodes>}
 */
const getTaxCodeList = async (filter) => {
  const taxCodes = await TaxCode.aggregate([
    {
      $match: filter,
    },
    {
      $sort: { code: 1 },
    },
    {
      $project:{
        _id:1,
        code:1,
        rate:1
      }
    }
  ]);

  return { taxCodes };
};

module.exports = {
  createTaxCode,
  updateTaxCodeById,
  queryTaxCodes,
  bulkUpload,
  deleteTaxCode,
  getTaxCodeList
};
