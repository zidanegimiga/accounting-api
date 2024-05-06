const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ObjectId } = require('mongodb');
const { expenseService,activityLogService,userService,accountService } = require('../services');
const { createInvoiceJournalEntry } = require('../controllers/journalEntry.controller');

const logActivity = async (userId, module, moduleInfo, action, data) => {
  const user = await userService.getUserById(userId);
  const activity = {
    user,
    module,
    module_info: moduleInfo,
    action,
    data,
  };
  await activityLogService.createLog(activity);
};

const getAll = catchAsync(async (req, res) => {
  const { search, limit, page } = req.query;
  const companyIds = req.body.company.map((id) => ObjectId(id));
  const filter = { is_deleted: 0,  company: { $in: companyIds }};
  const result = await expenseService.queryExpense(filter, search, limit, page);
  res.status(httpStatus.OK).send({ data: result });
});

const createExpense = catchAsync(async (req, res) => {
  const {body}=req
  let newExpenseID;
  const lastExpenseEntry = await expenseService.getLastExpense();
  console.log(lastExpenseEntry)
  if (!lastExpenseEntry) {
    newExpenseID = 'EX-1000';
  } else {
    newExpenseID = 'EX-' + (parseInt(lastExpenseEntry.expense_number.split('-')[1]) + 1);
  }
  const expense = await expenseService.createExpense({ ...body, expense_number: newExpenseID });
  logActivity(req.user._id, 'expense', expense, 'user created a expense', body);
  await createExpenseJournalEntry(body, expense.expense._id, req.user._id);
  res.status(httpStatus.CREATED).send({ data: expense });
});

const createExpenseJournalEntry = async (body, expenseId, user) => {
    const { journal_entry, customer, amount, payment_date, sub_total, vat_total, total,company,payment_account,payee,tax_item } = body;
    const paymentAccountInfo = await accountService.getAccountById(payment_account);
  
    // Convert customer and _id fields to ObjectId in all objects of accounts array
    const updatedAccounts = journal_entry.map((account) => {
      return {
        ...account,
        customer: ObjectId(account.customer),
        account: ObjectId(account.account),
      };
    });
  
    let line_items = updatedAccounts;
    if (paymentAccountInfo) {
      const item = {
        account: ObjectId(paymentAccountInfo._id),
        customer: ObjectId(payee),
        isDebit: false,
        isCredit: true,
        amount: total,
      };
      line_items.push(item);
    }
  
    const journal_payload = {
      line_items: line_items,
      sub_total,
      vat_total,
      total,
      journal_date: payment_date,
      isExpenseRelated: true,
      expense: expenseId,
      company:company,
      tax_item:tax_item
    };
    const result = await createInvoiceJournalEntry(journal_payload, user);
    return [];
  };

  const getExpenseJournal = catchAsync(async (req, res) => {
    const account = await accountService.getAccountById(ObjectId(req.params.id));
    const { name, _id: id } = account;
    const newAccount = { name, id };
    const vat = await accountService.getAccountByCode('VP');
    const result = {
      accounts: {
        debit: [vat, newAccount]
      }
    }
    res.status(httpStatus.OK).send({ data: result});
  })

  const getExpenseMenu = catchAsync(async (req, res) => {
    const result = await expenseService.getExpenseMenu();
    res.status(httpStatus.OK).send({data:result});
  });


module.exports = {
    createExpense,
    getExpenseJournal,
    getExpenseMenu,
    getAll
};
