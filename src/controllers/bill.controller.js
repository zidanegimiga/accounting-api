const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ObjectId } = require('mongodb');
const { billService,activityLogService,userService,accountService } = require('../services');
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

const createBill = catchAsync(async (req, res) => {
  const {body}=req
  let newBillID;
  const lastBillEntry = await billService.getLastBill();
  console.log(lastBillEntry)
  if (!lastBillEntry) {
    newBillID = 'BL-1000';
  } else {
    newBillID = 'BL-' + (parseInt(lastBillEntry.bill_number.split('-')[1]) + 1);
  }
  const bill = await billService.createBill({ ...body, bill_number: newBillID });
  logActivity(req.user._id, 'bill', bill, 'user created a bill', bill);
  await createBillJournalEntry(body, bill.bill._id, req.user._id);
  res.status(httpStatus.CREATED).send({ data: bill });
});

const createBillJournalEntry = async (body, billId, user) => {
    const { journal_entry, customer, amount, payment_date, sub_total, vat_total, total,company,payment_account,supplier,tax_item } = body;
    const paymentAccountInfo = await accountService.getAccountByCode({code:'AP',company:ObjectId(company)});
  
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
        customer: ObjectId(supplier),
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
      isBillRelated: true,
      bill: billId,
      company:company,
      tax_item:tax_item
    };
    const result = await createInvoiceJournalEntry(journal_payload, user);
    return [];
  };


module.exports = {
   createBill,
};
