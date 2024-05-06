const { Customer, customersCentralSchema,Company, Supplier } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const DATABASE_URL_CENTRAL = process.env.DATABASE_URL_CENTRAL;
const excelReader = require('../helpers/excel-reader');
const XLSX = require('xlsx');
const AWS = require('aws-sdk');
const moment = require('moment');
const csv = require('csv-writer');
const fs = require('fs');
const { ObjectId } = require('mongodb');

const createCustomerId = async () => {
  var uniqId = 'NN-' + Math.floor(Math.random() * (999 - 100 + 1) + 100);
  const customer = await Customer.findOne({ customer_id: uniqId });
  if (customer) {
    createCustomerId();
  } else {
    return uniqId;
  }
};

async function createCustomerWithRetry(conn, customerObj, customerSchema, retryCount, maxRetry) {
  var CentralUserModel = conn.model('customers', customerSchema);
  const newUserCentral = new CentralUserModel(customerObj);
  await newUserCentral
    .save()
    .then(async (centralResponse) => {
      const updatedBody = { ...body, customer_id };
      const customer = await Customer.create(updatedBody);
      return customer;
    })
    .catch(async (e) => {
      // console.log(retryCount,"retrying ...")
      if (retryCount < maxRetry) {
        await conn.close();
        setTimeout(
          async (e) => await createCustomerWithRetry(conn, customerObj, customerSchema, (retryCount += 1), maxRetry),
          5000
        );
      } else {
        await conn.close();
        return false;
      }
    });
}

/**
 * Create a Customer
 * @param {Object} body
 * @returns {Promise<Customer>}
 */
const createCustomer = async (body) => {
  let customer;
  let retryCount = 0;
  let maxRetry = 5;
  const customer_id = await createCustomerId();
  const updatedBody = { ...body, customer_id };
  /*** connect to the central db and create the user whenever we are adding a new user in the erp.*/

  const centralDBUrl = DATABASE_URL_CENTRAL;
  var mongoose = require('mongoose');
  const conn = mongoose.createConnection(centralDBUrl);

  var CentralUserModel = conn.model('customers', customersCentralSchema);
  const newUserCentral = new CentralUserModel(updatedBody);
  await newUserCentral
    .save()
    .then(async (centralResponse) => {
      const updatedBody = { ...body, customer_id };
      customer = await Customer.create(updatedBody);
      await conn.close();
    })
    .catch(async (e) => {
      console.log(e);
      const customer = await createCustomerWithRetry(conn, updatedBody, customersCentralSchema, retryCount, maxRetry);
      if (!customer) {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'customer not created');
      }
    });
  return customer;
};

/**
 * Query for Customer
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Customer>}
 */

const queryCustomers = async (filter, search, limit, pageNo) => {
  var nPerPage = parseInt(limit);
  var page = parseInt(pageNo);
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
    company_lookup,
    {
      $unwind : "$Comp"
    }
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
        {
          code: {
            $regex: '.*' + search + '.*',
            $options: 'i',
          },
        },
        {
          description: {
            $regex: '.*' + search + '.*',
            $options: 'i',
          },
        },
      ],
    });
    initialAggregateArray[1] = {
      $match: filterField,
    };
  }
  const filteredFieldArray = [
    {
      $project: {
        _id:1,
        city:1,
        company:1,
        customer_name:1,
        created_at:1,
        documents:1,
        email:1,
        industries:1,
        is_business:1,
        is_deleted:1,
        logo:1,
        phone:1,
        primary_contact:1,
        updated_at:1,
        company_name: "$Comp.company_name"
      },
    },
    {
      $sort: {
        customer_name: 1,
      },
    },
    { $skip: page == 0 ? page : page * nPerPage },
    { $limit: nPerPage },
  ];
  const aggregateArray = [...initialAggregateArray, ...filteredFieldArray];
  const customers = await Customer.aggregate(aggregateArray);
  const total_count = await Customer.find(filter).count();
  const total_page = Math.ceil(total_count / nPerPage);
  return {
    customers,
    total_count,
    total_page,
  };
};

/**
 * Get Customer by id
 * @param {number} id
 * @returns {Promise<Customer>}
 */
const getCustomerById = async (id) => {
  const customerData = await Customer.findById(id);
  let customerInfo = {}
  if(customerData){
    const company = await Company.findById(customerData.company);
      customerInfo={
        ...customerData.toObject(),
        company_name: company.company_name
      }
  }
  return  customerInfo ;
};


/**
 * Get Customer by id
 * @param {number} id
 * @returns {Promise<Customer>}
 */
const getCustomerSupplierById = async (id) => {
  console.log(id,"-----------id")
  let customerData = await Customer.findById(id);
  console.log(customerData,"----------customerData")

  let customerInfo = {}
  if(customerData == null){
    // console.log(customerData,"--------2")
    customerData = await Supplier.findById(id);
    // console.log(customerData,"----------customerData-----------1")
  }
  const company = await Company.findById(customerData.company);
    customerInfo={
      ...customerData.toObject(),
      company_name: company.company_name
    }
  return  customerInfo ;
};

/**
 * Update Customer tag by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Customer>}
 */
const updateCustomerById = async (id, updateBody) => {
  const customer = await getCustomerById(id);
  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(customer, updateBody);
  await customer.save();
  return customer;
};

/**
 * Get  Customer list for drop down
 * @returns {Promise<Customer>}
 */
const getCustomerList = async (filter) => {
  const customers = await Customer.aggregate([
    {
      $addFields : { category : "customer"}
    },
    {
      $match: filter,
    },
    {
      $sort: { customer_name: 1 },
    },
    {
      $project: {
        _id: 1,
        customer_name: 1,
        category : 1,
        company:1
      },
    },
  ]);

  return { customers };
};

/**
 * Get Customer email and address
 * @param {number} id
 * @returns {Promise<Customer>}
 */
const getCustomerBasics = async (id) => {
  const customer = await Customer.findById(id, { customer_name: 1, email: 1, billing_address: 1 });
  return customer;
};

/*** Get data function for bulk upload***/
const getData = (data) => {
  const header = data[0];
  return new Promise((resolve) => {
    const temp = [];
    const customerData = data.filter((item) => item.length > 0);
    customerData.forEach(async (row, i, array) => {
      if (i > 0 && row.length > 0) {
        const formatted = await excelReader.formatRow(row, header);
        const item = {
          is_business: formatted['Customer Type'] == 'Business' ? true : false,
          customer_name: formatted['Name'],
          email: formatted['Email'],
          phone: formatted['phone'],
          primary_contact: {
            name: formatted['Primary Contact'],
            email: formatted['Primary Contact Email'],
            phone: formatted['Primary Contact Phone'],
          },
          additional_contact: {
            name: formatted['Additional Contact'],
            email: formatted['Additional Contact Email'],
            phone: formatted['Additional Contact Phone'],
          },
          trn_number: formatted['TRN'],
          lead_source: formatted['Lead Source'],
          Currency: formatted['Currency'],
          shipping_address: formatted['Shipping Address'],
          billing_address: formatted['Billing Address'],
          company: formatted['Company'],
        };
        temp.push(item);
      }

      if (i === array.length - 1) {
        resolve(temp);
      }
    });
  });
};

/*** bulk upload customer***/
const bulkUpload = async (req) => {
  var result = { message: null, error: null };
  try {
    const filename = req.files.file.tempFilePath;
    const workbook = XLSX.readFile(filename);
    const worksheet = workbook.Sheets.Sheet1;
    const data = await XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    });
    const items = await getData(data);
    var duplicateCustomer = [];
    var customerList = [];
    if (items.length) {
      for (let i = 0; i < items.length; i++) {
        const info = items[i];
        const existing = await Customer.findOne({ customer_name: info.customer_name });
        if (existing) {
          duplicateCustomer.push(items[i].customer_name);
        } else {
          customerList.push(items[i]);
        }
      }
    }
    for (let i = 0; i < customerList.length; i++) {
      customerList[i].customerId = await createCustomerId();
    }
    if (customerList.length) {
      try {
        const insertedCustomerList = await Customer.insertMany(customerList, { ordered: false });
        if (insertedCustomerList.length) {
          result.message = `Successfully Added ${customerList.length} entries`;
        } else {
          result.error = true;
        }
      } catch (error) {
        result.message = `Error adding entries: ${error}`;
      }
    }
    if (duplicateCustomer.length) {
      result.error = {
        customer: duplicateCustomer,
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
 * Export Customer
 */
const exportCustomer = async (req, id) => {
  const {type,company}=req
  const companyIds = company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const s3 = new AWS.S3({
    accessKeyId: process.env.SECRET_ID_AWS,
    secretAccessKey: process.env.SECRET_KEY_AWS,
  });
  const customers = await Customer.aggregate([
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
        industries: 0,
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
        documents: 1,
        primary_contact: 1,
        is_business: 1,
        customer_name: 1,
        logo: 1,
        customer_id: 1,
        lead_source: 1,
        currency: 1,
        trn_number: 1,
        terms: 1,
        additional_contact: 1,
      },
    },
  ]);
  

  if (type == 'xlsx') {
    const sheet = XLSX.utils.json_to_sheet(customers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const currentDate = moment().format('YYYYMMDDHHmmssSSS');
    const fileName = `costCenter-${id}-${currentDate}`;
    const buffer = XLSX.write(workbook, { type: 'buffer' });

    const params = {
      Bucket: process.env.BUCKET_NAME + '/customer',
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
        { id: 'customer_name', title: 'Name' },
        { id: 'phone', title: 'Phone' },
        { id: 'email', title: 'Email' },
        { id: 'primary_contact.name', title: 'Primary Contact Name' },
        { id: 'primary_contact.email', title: 'Primary contact Email' },
        { id: 'primary_contact.phone', title: 'Primary contact Phone' },
        { id: 'is_business', title: 'Business' },
        { id: 'trn_number', title: 'TRN number' },
        { id: 'lead_source', title: 'Lead Source' },
        { id: 'currency', title: 'Currency' },
        { id: 'billing_address', title: 'Billing Address' },
        { id: 'shipping_address', title: 'Shipping Address' },
        { id: 'logo', title: 'logo' },
        { id: 'company', title: 'company' },
      ],
    });
    try {
      await writer.writeRecords(customers);
      const buffer = await fs.promises.readFile(fileName);
      const params = {
        Bucket: process.env.BUCKET_NAME + '/customers',
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
    const sheet = XLSX.utils.json_to_sheet(customers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');

    const currentDate = moment().format('YYYYMMDDHHmmssSSS');
    const fileName = `costCenter-${id}-${currentDate}.xls`;

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xls' });
    const params = {
      Bucket: process.env.BUCKET_NAME + '/customers',
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

const createCustomerBasics = async (body) => {
  const customer = await Customer.create(body);
  return { customer };
}

/**
 * Get Customer mail info
 * @param {number} id
 * @returns {Promise<Customer>}
 */
const getCustomerMailInfo = async (id) => {
  const customer = await Customer.aggregate([
    {
      $match: {
        _id: id,
      }
    },
    {
      $project: {
        _id: 1,
        email: 1,
        primary_contact:1
      }
    }
  ]);  
  return customer[0];
}

module.exports = {
  createCustomer,
  queryCustomers,
  getCustomerById,
  updateCustomerById,
  getCustomerList,
  getCustomerBasics,
  bulkUpload,
  exportCustomer,
  createCustomerBasics,
  getCustomerMailInfo,
  getCustomerSupplierById
};
