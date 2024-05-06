const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const {journalEntry,activityLogService,userService} = require('../services');
const ApiError = require('../utils/ApiError');
const { ObjectId } = require('mongodb');


const logJournalActivity = async (journal_number, userId, module, moduleInfo, action, data) => {
  const user = await userService.getUserById(userId);
  const journalActivity = {
    journal_number,
    user,
    module,
    module_info: moduleInfo,
    action,
    data,
  };
  await activityLogService.createJournalEntryLog(journalActivity);
};

  const createJournalEntry = catchAsync(async (req, res) => {
    var validJournal = false;
    const { body } = req;
    const {line_items}=body
    const debitsTotal = line_items.filter((item) => item.isDebit).reduce((total, item) => total + parseInt(item.amount), 0);
    const creditsTotal = line_items.filter((item) => item.isCredit).reduce((total, item) => total + parseInt(item.amount), 0);
    if (debitsTotal == creditsTotal) {
      validJournal = true;
    } else {
      throw new ApiError(httpStatus.FORBIDDEN, 'journal entry not matching');
    }
  
    if (validJournal) {
      const updatedLineItems=
      body.line_items.map((lineItem) => ({
        ...lineItem,
        account: new ObjectId(lineItem.account),
      }));
    const result= await generateJournalEntry({...body,line_items:updatedLineItems})
    await logJournalActivity(result.journalEntry._id, req.user._id, 'journalEntry', result, 'user created a new journal entry', body);
    res.status(httpStatus.OK).send({data:result});
    }
  });

  const createInvoiceJournalEntry = async (data,user) => {
    const result= await generateJournalEntry(data)
    await logJournalActivity(result.journalEntry._id, user, 'journalEntry', result, 'user created a new journal entry for invoice', data);
    return result
  }
 
  const generateJournalEntry = async (data) => {
    let newJournalNumber;
    const lastJournalNumber = await journalEntry.getLastJournalEntry();
    if (!lastJournalNumber) {
      newJournalNumber = 'JN-0001';
    } else {
      let currentNum = parseInt(lastJournalNumber.journal_number.split('-')[1]);
      let nextNum = currentNum + 1;
      let leadingZeros = '0'.repeat(4 - nextNum.toString().length);
      newJournalNumber = 'JN-' + leadingZeros + nextNum;
    }    
    const result = await journalEntry.createJournalEntry({...data,journal_number:newJournalNumber});
    return result
  };

  const updateJournalEntry = catchAsync(async (req, res) => {
    const result = await journalEntry.updateJournalEntry(req.params.id, req.body);
    await logJournalActivity(req.params.id,req.user._id, 'journalEntry', result, 'user updated  journalEntry', req.body);
    res.status(httpStatus.OK).send({data:result});
});


const getJournalByInvoice = catchAsync(async (req, res) => {
  const journalInfo = await journalEntry.getJournalByInvoice(req.params.id);
  res.status(httpStatus.OK).send({ data: journalInfo });
})

module.exports = {
    createJournalEntry,
    createInvoiceJournalEntry,
    updateJournalEntry,
    getJournalByInvoice
};
