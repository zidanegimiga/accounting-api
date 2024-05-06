const { Configuration } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const { Invoice,CreditNote,DebitNote } = require('../models');


/**
 * Get sale location list for drop down
 * @returns {Promise<ChartOfAccounts>}
 */
const getSaleLocation = async (filter) => {
    const configuration = await Configuration.findOne(
        {
          type: 'invoice',
        },
        {
          _id: 0,
          type: 0,
        }
      );
      const fields = configuration.fields;
      return fields
};

/**
 * Query for All Sales
 */
const queryAllSales = async (filter,search, limit,pageNo) => {
  var nPerPage = parseInt(limit)
  var page=parseInt(pageNo)
  var filterField = {
    $and: [{
      is_deleted: 0
    }]
  };
  const initialAggregateArray = [{
    $match: filter
  },
  {
    $lookup: {
      from: 'customers',
      let: {
        customer: '$customer',
      },
      pipeline: [{
          $match: {
            $expr: {
              $and: [{
                $eq: ['$_id', '$$customer']
              }]
            }
          }
        },
        {
          $project: {
            _id: 1,
            customer_name: 1,
          },
        },
      ],
      as: 'customerInfo',
    },
  },
  {
    $addFields: {
      customer: {
        $arrayElemAt: ['$customerInfo', 0]
      }
    }
  },
  {
    $project: {
      customerInfo: 0,
   },
  },
];

  if (search) {
    filterField.$and.push({
      $or: [{
        invoice_number: {
            $regex: '.*' + search + '.*',
            $options: 'i'
          }
        },

      ],
    });
    initialAggregateArray[4] = {
      $match: filterField
    };
  }
  const filteredFieldArray = [{
    $project: {
      due_date:1,
      invoice_number:1,
      customer:'$customer.customer_name',
      total:1,
      paid:1,
      status:1,
      invoice_path:1,

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

  const invoices = await Promise.all([
    Invoice.aggregate(aggregateArray)
  ]);
  const sales = [...invoices[0]];

  const total_count = sales.length
  const total_page = Math.ceil(total_count / nPerPage);
  return {
    sales,
    total_count,
    total_page
  };
};


/**
 * Query for All Sales
 */
const queryDebitNotes = async (filter,search, limit,pageNo) => {
  var nPerPage = parseInt(limit)
  var page=parseInt(pageNo)
  var filterField = {
    $and: [{
      is_deleted: 0
    }]
  };
  const initialAggregateArray = [{
    $match: filter
  },
  {
    $lookup: {
      from: 'customers',
      let: {
        customer: '$customer',
      },
      pipeline: [{
          $match: {
            $expr: {
              $and: [{
                $eq: ['$_id', '$$customer']
              }]
            }
          }
        },
        {
          $project: {
            _id: 1,
            customer_name: 1,
          },
        },
      ],
      as: 'customerInfo',
    },
  },
  {
    $addFields: {
      customer: {
        $arrayElemAt: ['$customerInfo', 0]
      }
    }
  },
  {
    $project: {
      customerInfo: 0,
   },
  },
];

  if (search) {
    filterField.$and.push({
      $or: [{
        invoice_number: {
            $regex: '.*' + search + '.*',
            $options: 'i'
          }
        },

      ],
    });
    initialAggregateArray[4] = {
      $match: filterField
    };
  }
  const filteredFieldArray = [{
    $project: {
      due_date:1,
      invoice_number:1,
      customer:'$customer.customer_name',
      total:1,
      paid:1,
      status:1,
      debit_note_link:1,
      debit_note_number:1

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

  const invoices = await Promise.all([
    DebitNote.aggregate(aggregateArray)
  ]);
  const debitNote = [...invoices[0]];

  const total_count = debitNote.length
  const total_page = Math.ceil(total_count / nPerPage);
  return {
    debitNote,
    total_count,
    total_page
  };
};


const querySalesAndDebitNotes = async (filter, search, limit, pageNo) => {
  var nPerPage = parseInt(limit);
  var page = parseInt(pageNo);
  var filterField = {
    $and: [{ is_deleted: 0 }],
  };
  const initialAggregateArray = [
    {
      $match: filter,
    },
    {
      $lookup: {
        from: "customers",
        let: {
          customer: "$customer",
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$_id", "$$customer"] }],
              },
            },
          },
          {
            $project: {
              _id: 1,
              customer_name: 1,
            },
          },
        ],
        as: "customerInfo",
      },
    },
    {
      $addFields: {
        customer: { $arrayElemAt: ["$customerInfo", 0] },
      },
    },
    {
      $project: {
        customerInfo: 0,
      },
    },
  ];

  if (search) {
    filterField.$and.push({
      $or: [
        {
          invoice_number: {
            $regex: ".*" + search + ".*",
            $options: "i",
          },
        },
      ],
    });
    initialAggregateArray[4] = {
      $match: filterField,
    };
  }

  const salesFilteredFieldArray = [
    {
      $project: {
        due_date: 1,
        invoice_number: 1,
        customer: "$customer.customer_name",
        total: 1,
        paid: 1,
        status: 1,
        invoice_path: 1,
        type: "invoice",
        link:"$invoice_path"
      },
    },
    {
      $project: {
        invoice_path: 0,
      },
    },
    {
      $sort: {
        created_at: 1,
      },
    },
    { $skip: page == 0 ? page : page * nPerPage },
    { $limit: nPerPage },
  ];

  const debitNotesFilteredFieldArray = [
    {
      $project: {
        due_date: 1,
        invoice_number: 1,
        customer: "$customer.customer_name",
        total: 1,
        paid: 1,
        status: 1,
        debit_note_link: 1,
        debit_note_number: 1,
        type: "debit_note",
        link:"$debit_note_link"
      },
    },      {
        $project: {
          debit_note_link: 0,
        },
      },
    {
      $sort: {
        created_at: 1,
      },
    },
    { $skip: page == 0 ? page : page * nPerPage },
    { $limit: nPerPage },
  ];

  const [invoices, debitNotes] = await Promise.all([
    Invoice.aggregate([...initialAggregateArray,...salesFilteredFieldArray]),
    DebitNote.aggregate([...initialAggregateArray,...debitNotesFilteredFieldArray]),
  ]);

  const sales = invoices.map((inv) => ({
    ...inv,
    type: "invoice",
  }));
  const debitNote = debitNotes.map((dn) => ({
    ...dn,
    type: "debit_note",
  }));


  const result = [...sales, ...debitNote];
  const total_count = result.length;
  const total_page = Math.ceil(total_count / nPerPage);

  return {
    result,
    total_count,
    total_page,
  };
};


/**
 * Get drop down menu for sales page
 * @returns {Promise<ChartOfAccounts>}
 */
const getSaleMenu = async (filter) => {
  const configuration = await Configuration.findOne(
      {
        type: 'Sale',
      },
      {
        _id: 0,
        type: 0,
      }
    );
    const fields = configuration.fields;
    return fields
};



module.exports = {
    getSaleLocation,
    queryAllSales,
    getSaleMenu,
    queryDebitNotes,
    querySalesAndDebitNotes
};
