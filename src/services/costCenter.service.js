const { CostCenter } = require('../models');
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
 * Create a cost center
 * @param {Object} body
 * @returns {Promise<CostCenters>}
 */
const createCostCenter = async (body) => {
  const costCenter = await CostCenter.create(body);
  return { costCenter };
};

/**
 * Query for cost centers
 * @param {Object} filter - Mongo filter
 * @returns {Promise<CostCenters>}
 */

const queryCostCenters = async (filter,search, limit,pageNo) => {
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
        {
          description: {
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
      name: 1
    },
  },
  {$skip:page==0?page:page*nPerPage},
  {$limit: nPerPage}
  ];
  const aggregateArray = [...initialAggregateArray, ...filteredFieldArray];
  const costCenters = await CostCenter.aggregate(aggregateArray);
  const total_count = await CostCenter.find(filterField).count()
  const total_page = Math.ceil(total_count / nPerPage);
  return {
    costCenters,
    total_count,
    total_page
  };
};

/**
 * Get for cost center by id
 * @param {number} id
 * @returns {Promise<CostCenters>}
 */
const getCostCenterById = async (id) => {
  const costCenter = await CostCenter.findById(id);
  return costCenter;
};

/**
 * Update cost centers by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<CostCenters>}
 */
const updateCostCenterById = async (id, updateBody) => {
  const costCenter = await getCostCenterById(id);
  if (!costCenter) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(costCenter, updateBody);
  await costCenter.save();
  return costCenter;
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
                  description:formatted.description,
                  company: formatted['Company'],
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
    var duplicateCostCenter = [];
    var costCenterList = [];
    if (items.length) {
      for (let i = 0; i < items.length; i++) {
        const info = items[i];
        const existing = await CostCenter.findOne({ code: info.code });
        if (existing) {
          duplicateCostCenter.push(items[i].code);
        } else {
          costCenterList.push(items[i]);
        }
      }
    }
    if (costCenterList.length) {
      try {
        const insertedCostCenterList = await CostCenter.insertMany(costCenterList, { ordered: false });
        if (insertedCostCenterList.length) {
          result.message = `Successfully Added ${costCenterList.length} entries`;
        } else {
          result.error = true;
        }
        // await CostCenter.insertMany(costCenterList, { ordered: false });
        // result.message = `Successfully Added ${costCenterList.length} entries`;
      } catch (error) {
        result.message = `Error adding entries: ${error}`;
      }
    }
    if (duplicateCostCenter.length) {
      result.error = {
        costCenter: duplicateCostCenter,
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
 * Delete cost centers by id
 * @param {ObjectId} Id
 * @returns {Promise<CostCenters>}
 */
const deleteCostCenter = async (id) => {
  const costCenter = await getCostCenterById(id);
  if (!costCenter) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  costCenter.is_deleted = 1;
  await costCenter.save();
  return costCenter;
};

/**
 * Export cost centers 
 */
const exportCostCenter = async (req, id) => {
  const {type,company}=req
  const companyIds = company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const s3 = new AWS.S3({
    accessKeyId: process.env.SECRET_ID_AWS,
    secretAccessKey: process.env.SECRET_KEY_AWS,
  });
  const cost_center = await CostCenter.aggregate([
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
        name: 1,
        description: 1,
        code: 1,
      },
    },

  ]);

  if (type == 'xlsx') {
    const sheet = XLSX.utils.json_to_sheet(cost_center);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const currentDate = moment().format('YYYYMMDDHHmmssSSS');
    const fileName = `costCenter-${id}-${currentDate}`;
    const buffer = XLSX.write(workbook, { type: 'buffer' });

    const params = {
      Bucket: process.env.BUCKET_NAME + '/cost_center',
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
    const fileName = `costCenter-${id}-${currentDate}.csv`;
    const writer = csv.createObjectCsvWriter({
      path: fileName,
      header: [
        { id: 'name', title: 'Name' },
        { id: 'code', title: 'Code' },
        { id: 'description', title: 'Description' },
        { id: 'company', title: 'company' },
      ],
    });
    try {
      await writer.writeRecords(cost_center);
      const buffer = await fs.promises.readFile(fileName);
      const params = {
        Bucket: process.env.BUCKET_NAME + '/cost_center',
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
    const fileName = `costCenter-${id}-${currentDate}.xls`;

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xls' });
    const params = {
      Bucket: process.env.BUCKET_NAME + '/cost_center',
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

module.exports = {
  createCostCenter,
  updateCostCenterById,
  queryCostCenters,
  bulkUpload,
  deleteCostCenter,
  exportCostCenter
};
