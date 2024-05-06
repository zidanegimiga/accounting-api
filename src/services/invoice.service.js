const { Invoice, Payment, CreditNote, DebitNote, InvoiceLink,JournalEntry } = require('../models');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const moment = require('moment');
const { ObjectId } = require('mongodb');

/**
 * Create a invoice
 * @param {Object} body
 * @returns {Promise<Invoice>}
 */
const createInvoice = async (body) => {
  const invoice = await Invoice.create(body);
  return {
    invoice,
  };
};

/**
 * insert Bulk invoice
 * @param {Object} body
 * @returns {Promise<Invoice>}
 */
const insertInvoice = async (body) => {
  const invoices = await Invoice.insertMany(body);
  return invoices
};

/**
 * Update all due invoices status to overdue
 * @returns {Promise<Invoice>}
 */
const updateAllDueInvoices = async (filter) => {
  const invoices = await Invoice.updateMany(filter, { status: "Overdue" }, { new: true });

  return {
    invoices
  };
};

/**
 * Query for invoices
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Invoice>}
 */
const queryInvoice = async (filter, search, limit, pageNo) => {
  var nPerPage = parseInt(limit)
  var page = parseInt(pageNo)
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
      $or: [
        {
          invoice_number: {
            $regex: '.*' + search + '.*',
            $options: 'i'
          }
        },
        { 
          customer_name: {
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
      items:1,
      customer_address:1,
      invoice_date:1,
      due_date:1,
      customerId:'$customer._id',
      sub_total:1,
      vat_total:1,
      company:1,
      customer_name:1,
      terms:1,
      email:1,
      sale_location:1,
      balance_due:1,
      invoice_path: {
        $arrayElemAt: [
          { $filter: { input: '$invoice_path', as: 'path', cond: { $eq: ['$$path.status', 1] } } },
          0
        ]
      }
    }
  }, {
    $sort: {
      created_at: 1
    },
  },
  { $skip: page == 0 ? page : page * nPerPage },
  { $limit: nPerPage }
  ];
  const aggregateArray = [...initialAggregateArray, ...filteredFieldArray];
  const invoices = await Invoice.aggregate(aggregateArray);
  const total_count = await Invoice.find(filterField).count()
  const total_page = Math.ceil(total_count / nPerPage);
  return {
    invoices,
    total_count,
    total_page
  };
};

/**
 * Query for Last invoices
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Invoice>}
 */
const getLastInvoice = async (filter) => {
  const latestDoc = await Invoice.aggregate([
    {
      $project: {
        _id: 1,
        invoice_number: 1
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

/**
 * Query for  invoices by recurring_template id and due date
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Invoice>}
 */
const getInvoiceByNo = async (invoice_number) => {
  const invoice = await Invoice.countDocuments({ invoice_number: invoice_number })
  return invoice;
};

/**
 * Query for Last invoice template by ud
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Invoice>}
 */
const getLastInvoiceByTemplateById = async (id) => {
  const latestDoc = await Invoice.aggregate([
    {
      $match: {
        recurring_template: id,
      }
    },
    {
      $project: {
        _id: 1,
        invoice_date: 1
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


/**
 * Get for invoice by id
 * @param {number} id
 * @returns {Promise<Invoice>}
 */
const getInvoiceById = async (id) => {
  const invoice = await Invoice.findById(id);
  return invoice;
};

/**
 * Update invoice by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<Invoice>}
 */
const updateInvoiceById = async (id, updateBody) => {
  console.log(updateBody)
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(invoice, updateBody);
  await invoice.save();
  return invoice;
};

/**
 * Record Payment for invoice
 * @param {Object} body
 * @returns {Promise<Payment>}
 */
const recordPayment = async (body) => {
  const payment = await Payment.create(body);
  return { payment };
};

/**
 * Create a credit note for  invoice
 * @param {Object} body
 * @returns {Promise<CreditNote>}
 */
const createCreditNote = async (body) => {
  const creditNote = await CreditNote.create(body);
  return {
    creditNote,
  };
};

/**
 * Query for Last credit note
 * @param {Object} filter - Mongo filter
 * @returns {Promise<Invoice>}
 */
const getLastCreditNote = async (filter) => {
  const latestDoc = await CreditNote.aggregate([
    {
      $project: {
        _id: 1,
        credit_note_number: 1
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

/**
 * Update credit note by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<DebitNote>}
 */
const updateCreditNoteId = async (id, updateBody) => {
  const creditNote = await getCreditNoteById(id);
  if (!creditNote) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(creditNote, updateBody);
  await creditNote.save();
  return creditNote;
};

/**
 * Get for credit note by id
 * @param {number} id
 * @returns {Promise<DebitNote>}
 */
const getCreditNoteById = async (id) => {
  const creditNote = await CreditNote.findById(id);
  return creditNote;
};

/**
 * Create a debit note for  invoice
 * @param {Object} body
 * @returns {Promise<DebitNote>}
 */
const createDebitNote = async (body) => {
  const debitNote = await DebitNote.create(body);
  return {
    debitNote,
  };
};

/**
 * Query for Last debit note
 * @param {Object} filter - Mongo filter
 * @returns {Promise<DebitNote>}
 */
const getLastDebitNote = async (filter) => {
  const latestDoc = await DebitNote.aggregate([
    {
      $project: {
        _id: 1,
        debit_note_number: 1
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

/**
 * Get for debit note by id
 * @param {number} id
 * @returns {Promise<DebitNote>}
 */
const getDebitNoteById = async (id) => {
  const debitNote = await DebitNote.findById(id);
  return debitNote;
};

/**
 * Update debit note by id
 * @param {ObjectId} id
 * @param {Object} updateBody
 * @returns {Promise<DebitNote>}
 */
const updateDebitNoteId = async (id, updateBody) => {
  const debitNote = await getDebitNoteById(id);
  if (!debitNote) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  Object.assign(debitNote, updateBody);
  await debitNote.save();
  return debitNote;
};

/**
 * Create a invoice eLink for  invoice
 * @param {Object} body
 * @returns {Promise<InvoiceLink>}
 */
const createInvoiceLink = async (body) => {
  const invoiceLink = await InvoiceLink.create(body);
  return invoiceLink
};

/**
 * Create a invoice eLink for  invoice
 * @param {Object} body
 * @returns {Promise<InvoiceLink>}
 */
const cancelInvoice = async (id) => {
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    throw new ApiError(httpStatus.NOT_FOUND, 'record not found');
  }
  invoice.cancelled = 1;
  await invoice.save();
  return invoice;
};

//get info for journal entry while doing invoice action
const getAccountInfo = async (id) => {
  const AccountInfo = await Invoice.aggregate([
    {
      $match: {
        _id: ObjectId(id)
      }
    },
    {
      $project: {
        _id: 1,
        items: 1,
        customer: 1
      }
    }
  ]);
  return AccountInfo[0]

};

/**
 * Get paid invoice
 * @returns {Promise<Invoice>}
 */
const getPaidInvoice = async (filter) => {
  const invoice = await Invoice.aggregate([
    {
      $match: filter
    },
    // {
    //   $match : {$expr: {$ne: ["$balance_due", "$total"]}}
    // },
    // {
    //   $match : { paid : true}
    // },
    {
      $group: {
        _id: null,
        total_paid: { $sum: { $subtract: ["$total", "$balance_due"] } },
        total_unpaid: { $sum: { $subtract: [{ $sum: "$total" }, { $sum: { $subtract: ["$total", "$balance_due"] } }] } },
        total_amount: { $sum: "$total" },
        count: { $sum: 1 }
      }
    }
  ]);
  return invoice;
};

/**
 * Get unpaid invoice
 * @returns {Promise<Invoice>}
 * 
 */
const getUnpaidInvoice = async (filter) => {
  const today = new Date(new Date().setHours(0, 0, 0, 0))
  const total_due = {
    $sum: {
      $cond: [
        {
          $and: [
            { $gt: ["$due_date", today], }
          ]
        }, "$balance_due", 0,
      ],
    },
  }

  const total_overdue = {
    $sum: {
      $cond: [
        {
          $and: [
            { $lte: ["$due_date", today], }
          ]
        }, "$balance_due", 0,
      ],
    },
  }
  const invoice = await Invoice.aggregate([
    {
      $match: filter
    },
    // {
    //   $match : {$expr: {$ne: ["$balance_due", "$total"]}}
    // },
    {
      $match: { paid: false }
    },
    {
      $group: {
        _id: null,
        total_unpaid: { $sum: { $subtract: [{ $sum: "$total" }, { $sum: { $subtract: ["$total", "$balance_due"] } }] } },
        total_due: total_due,
        total_overdue: total_overdue,
        count: { $sum: 1 }
      }
    }
  ]);
  return invoice;
};

/**
 * Get partial-paid invoice
 * @returns {Promise<Invoice>}
 */
const getPartialPaidInvoice = async (filter) => {
  const invoice = await Invoice.aggregate([
    {
      $match: filter
    },
    {
      $match: { paid: false, status: "Partially Paid" }
    },
    {
      $group: {
        _id: null,
        total_paid: { $sum: { $subtract: ["$total", "$balance_due"] } },
        total_unpaid: { $sum: { $subtract: [{ $sum: "$total" }, { $sum: { $subtract: ["$total", "$balance_due"] } }] } },
        total_amount: { $sum: "$total" },
        count: { $sum: 1 }
      }
    }
  ]);
  return invoice;
};

/**
 * Get last n days invoice
 * @param {Object} filter - Mongo filter
 * @param {Date} previousDate - Mongo filter
 * @returns {Promise<Invoice>}
 */
const getNewInvoice = async (filter, previousDate) => {

  const invoice = await Invoice.aggregate([
    {
      $match: filter
    },
    // {
    //   $match : {$expr: {$ne: ["$balance_due", "$total"]}}
    // },
    {
      $match: { createdAt: { $gte: previousDate } }
    },
    {
      $group: {
        _id: null,
        total_paid: { $sum: { $subtract: ["$total", "$balance_due"] } },
        total_unpaid: { $sum: { $subtract: [{ $sum: "$total" }, { $sum: { $subtract: ["$total", "$balance_due"] } }] } },
        total_amount: { $sum: "$total" },
        count: { $sum: 1 }
      }
    }
  ]);
  return invoice;
};

/**
 * get all due invoices
 * @returns {Promise<Invoice>}
 */
const getTotalRevenueByServiceGroup = async (filter) => {
  let totalRev = 0
  let invoicesTotal = await Invoice.aggregate([
    {
      $match: filter
    },
    {
      $group: {
        _id: null,
        total_invoices: { $sum: { $toInt: "$total" } }
      }
    },
    {
      $project: {
        _id: 0,
        total_invoices: "$total_invoices",
      }
    }

  ]);
  if(invoicesTotal.length > 0){
    totalRev = invoicesTotal[0].total_invoices
  }else{
    totalRev = 1
  }
  const invoices = await Invoice.aggregate(
    [
      {
        $match: filter
      },
      {
        $unwind: "$items"
      },
      {
        $group: {
          _id: "$items.service_name",
          total: { $sum: "$items.net_total" }
        }
      },
      {
        $project:{
          name:"$_id",
          total : "$total",
          "percentage": {
            $trunc: [
              {
                $multiply: [
                  100,
                  { $divide: ["$total", totalRev] }
                ]
              }, 2
            ]
          },
        }
      }
    ]
  );

  return {
    invoices
  };
};

/**
 * Get unpaid invoice
 * @returns {Promise<Invoice>}
 * 
 */
const getUnpaidInvoiceByCustomer = async (filter) => {
  const today = new Date(new Date().setHours(0, 0, 0, 0))
  const total_due = {
    $sum: {
      $cond: [
        {
          $and: [
            { $gt: ["$due_date", today], }
          ]
        }, "$balance_due", 0,
      ],
    },
  }

  const total_overdue = {
    $sum: {
      $cond: [
        {
          $and: [
            { $lte: ["$due_date", today], }
          ]
        }, "$balance_due", 0,
      ],
    },
  }
  const invoice = await Invoice.aggregate([
    {
      $match: filter
    },
    // {
    //   $match : {$expr: {$ne: ["$balance_due", "$total"]}}
    // },
    {
      $match: { paid: false }
    },
    {
      $group: {
        _id: "$customer_name",
        total_unpaid: { $sum: { $subtract: [{ $sum: "$total" }, { $sum: { $subtract: ["$total", "$balance_due"] } }] } },
        total_due: total_due,
        total_overdue: total_overdue,
        count: { $sum: 1 }
      }
    },
    {
      $limit: 5
    }
  ]);
  return invoice;
};

/**
 * Get customer invoice
 * @returns {Promise<Invoice>}
 */
const getCustomerInvoices = async (id) => {
  const invoice = await Invoice.aggregate([
    {
      $match: { customer : id, is_deleted : 0}
    },
  ]);
  return invoice;
};

/**
 * insert Bulk invoice
 * @param {Object} body
 * @returns {Promise<Invoice>}
 */
const getInvoiceJournal = async (id) => {
  const journalInfo = await JournalEntry.findOne({ invoice: ObjectId(id) });
  const { line_items } = await JournalEntry.findOne({ invoice: ObjectId(id) });
  const accountList = line_items.find(({ isDebit }) => isDebit);
  const writeOff = { ...accountList, isDebit: !accountList.isDebit, isCredit: !accountList.isCredit };
  const voidAccounts = line_items.map(item => ({ ...item, isDebit: true, isCredit: false, amount: 0 }));
  
  const journal=[
    {
      name:"payment",
      account:writeOff
    },
    {
      name:"void",
      account:voidAccounts
    },
    {
      name:"writeOff",
      account:writeOff
    }
  ]
  
  return journal
};


module.exports = {
  createInvoice,
  queryInvoice,
  getLastInvoice,
  getInvoiceByNo,
  getLastInvoiceByTemplateById,
  insertInvoice,
  updateInvoiceById,
  recordPayment,
  getInvoiceById,
  createCreditNote,
  getLastCreditNote,
  updateCreditNoteId,
  getCreditNoteById,
  createDebitNote,
  getLastDebitNote,
  updateDebitNoteId,
  getDebitNoteById,
  createInvoiceLink,
  cancelInvoice,
  getAccountInfo,
  updateAllDueInvoices,
  getPaidInvoice,
  getUnpaidInvoice,
  getNewInvoice,
  getPartialPaidInvoice,
  getTotalRevenueByServiceGroup,
  getUnpaidInvoiceByCustomer,
  getInvoiceJournal,
  getCustomerInvoices,
};
