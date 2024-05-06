const { Service } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const { ObjectId } = require('mongodb');

/**
 * Create a service
 * @param {Object} body
 * @returns {Promise<Service>}
 */
const createService = async (body) => {
  const service = await Service.create(body);
  return {
    service,
  };
};

/**
 * Query for services
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Service>}
 */

const queryServices = async (filter, search, limit, pageNo) => {
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
        from: 'tax_codes',
        let: {
          tax_code: '$tax_code',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$tax_code'],
                  },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              code: 1,
              rate: 1,
            },
          },
        ],
        as: 'taxCode',
      },
    },
    {
      $lookup: {
        from: 'accounts',
        let: {
          income_account: '$income_account',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$income_account'],
                  },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
            },
          },
        ],
        as: 'accounts',
      },
    },
    {
      $addFields: {
        income_account: {
          $arrayElemAt: ['$accounts', 0],
        },
      },
    },
    {
      $addFields: {
        tax_code: {
          $arrayElemAt: ['$taxCode', 0],
        },
      },
    },

    {
      $project: {
        taxCode: 0,
        accounts: 0,
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
        {
          type: {
            $regex: '.*' + search + '.*',
            $options: 'i',
          },
        },
        {
          sku: {
            $regex: '.*' + search + '.*',
            $options: 'i',
          },
        },
        {
          type: {
            $regex: '.*' + search + '.*',
            $options: 'i',
          },
        },
        { 'income_account.name': { $regex: '.*' + search + '.*', $options: 'i' } },
        { 'tax_code.code': { $regex: '.*' + search + '.*', $options: 'i' } },
      ],
    });
    initialAggregateArray[6] = {
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
      $sort: {
        created_at: 1,
      },
    },
    {
      $skip: page == 0 ? page : page * nPerPage,
    },
    {
      $limit: nPerPage,
    },
  ];
  const aggregateArray = [...initialAggregateArray, ...filteredFieldArray];

  const services = await Service.aggregate(aggregateArray);
  const total_count = await Service.find(filterField).count();
  const total_page = Math.ceil(total_count / nPerPage);
  return {
    services,
    total_count,
    total_page,
  };
};

/**
 * Get for service by id
 * @param {number} id
 * @returns {Promise<Service>}
 */
const getServiceById = async (id) => {
  const service = await Service.findById(id);
  return service;
};

/**
 * Update service by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Service>}
 */
const updateServiceById = async (id, updateBody) => {
  const service = await getServiceById(id);
  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(service, updateBody);
  await service.save();
  return service;
};

/**
 * Delete service by id
 * @param {ObjectId} Id
 * @returns {Promise<Service>}
 */
const deleteService = async (id) => {
  const service = await getServiceById(id);
  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  service.is_deleted = 1;
  await service.save();
  return service;
};

/**
 * Update product count by id
 * @param {ObjectId} id
 * @returns {Promise<Service>}
 */
const updateProductCount = async (id) => {
  const product = await getServiceById(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  if (product.quantity != 0) {
    product.quantity = product.quantity - 1;
    await product.save();
    return product;
  }
};

//get info for journal entry while creating invoice
const getInfo = async (id) => {
  const serviceInfo = await Service.aggregate([
    {
      $match: {
        _id: ObjectId(id)
      }
    },
    {
      $lookup: {
        from: "accounts",
        let: {
          income_account_id: "$income_account"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", "$$income_account_id"]
              }
            }
          },
          {
            $project: {
              name: 1,
              _id: 0,
              id: "$_id",
            }
          }
        ],
        as: "income_account"
      }
    },
    {
      $lookup: {
        from: "accounts",
        let: {
          expense_account_id: "$expense_account"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$_id", "$$expense_account_id"]
              }
            }
          },
          {
            $project: {
              name: 1,
              _id: 0,
              id: "$_id",
            }
          }
        ],
        as: "expense_account"
      }
    },
    {
      $addFields: {
        accounts: {
          credit: {
            $arrayElemAt: [["$income_account"], 0]
          },
          debit: {
            $arrayElemAt: [["$expense_account"], 0]
          }
        }
      }
    },
    {
      $project: {
        id: 1,
        accounts: 1,
        name:1
      }
    }
  ]);
  return serviceInfo[0]
};

/**
 * Get chart of Product list for drop down
 * @returns {Promise<Service>}
 */
const getProductList = async (filter) => {
  const products = await Service.aggregate([
    {
      $match: filter,
    },
    {
      $sort: { created_at: 1 },
    },
    {
      $lookup: {
        from: 'tax_codes',
        let: {
          tax_code: '$tax_code',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ['$_id', '$$tax_code'],
                  },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              code: 1,
              rate: 1,
            },
          },
        ],
        as: 'taxCode',
      },
    },
    {
      $addFields: {
        tax_code: {
          $arrayElemAt: ['$taxCode', 0],
        },
      },
    },
    {
      $project: {
        _id: 1,
        name:1,
        price:1,
        tax_code:1,
        isInventory:1
      },
    },
  ]);

  return { products };
};



module.exports = {
    createService,
  updateServiceById,
  queryServices,
  deleteService,
  getServiceById,
  updateProductCount,
  getInfo,
  getProductList
};
