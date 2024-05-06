const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { RecurringInvoiceService, activityLogService, userService, invoiceService } = require('../services');
const { invoiceController } = require('../controllers');
const { getDueDate } = require('../helpers/invoice');
const { ObjectId } = require('mongodb');
const cron = require('node-cron');
const moment = require('moment');


const testCron = async () => {
  const today = moment().format('YYYY-MM-DD');
  const invoiceTemplates = await RecurringInvoiceService.getRecurringInvoiceTemplate();
  let recurring_invoices = [];
  const lastInvoice = await invoiceService.getLastInvoice();
  let newInvoiceID = lastInvoice ? parseInt(lastInvoice.invoice_number) + 1 : 1000;
  await Promise.all(
    invoiceTemplates.map(async (template) => {
      try {
        const { _id, recurring_frequency, ...payload } = template;
        const lastInvoice = await invoiceService.getLastInvoiceByTemplateById(ObjectId(_id));
        if (recurring_frequency.interval == 'Day') {
          var currentDate = lastInvoice
            ? moment(lastInvoice.invoice_date, 'YYYY-MM-DD').add(recurring_frequency.day, 'days')
            : recurring_frequency.start_date;
          while (moment.duration(moment(currentDate).diff(moment(today))).as('days') <= 0) {
            const date = moment(currentDate).format('YYYY-MM-DD');
            const due_date = getDueDate(payload.terms, date);
            recurring_invoices.push({...payload, due_date: due_date, invoice_date: date, is_recurring: true, recurring_template: _id, invoice_number: newInvoiceID,});
            currentDate = moment(currentDate).add(recurring_frequency.day, 'days');
            newInvoiceID = parseInt(newInvoiceID) + 1;
          }
        } 
        else if (recurring_frequency.interval == 'Week') {
          var currentDate = lastInvoice
            ? moment(lastInvoice.invoice_date, 'YYYY-MM-DD').add(recurring_frequency.week_count, 'weeks')
            : recurring_frequency.start_date;
          while (moment.duration(moment(currentDate).diff(moment(today))).as('days') <= 0) {
            const date = moment(currentDate).format('YYYY-MM-DD');
            const due_date = getDueDate(payload.terms, date);
            recurring_invoices.push({...payload, due_date: due_date, invoice_date: date, is_recurring: true, recurring_template: _id, invoice_number: newInvoiceID,});
            currentDate = moment(currentDate).add(recurring_frequency.week_count, 'weeks');
            newInvoiceID = parseInt(newInvoiceID) + 1;
          }
        } 
        else if (recurring_frequency.interval == 'Month') {
          var currentDate = lastInvoice
            ? moment(lastInvoice.invoice_date, 'YYYY-MM-DD').add(recurring_frequency.month_count, 'weeks')
            : recurring_frequency.start_date;
          while (moment.duration(moment(currentDate).diff(moment(today))).as('days') <= 0) {
            const date = moment(currentDate).format('YYYY-MM-DD');
            const due_date = getDueDate(payload.terms, date);
            recurring_invoices.push({...payload, due_date: due_date, invoice_date: date, is_recurring: true, recurring_template: _id, invoice_number: newInvoiceID,});
            currentDate = moment(currentDate).add(recurring_frequency.month_count, 'weeks');
            newInvoiceID = parseInt(newInvoiceID) + 1;
          }
        }
         else if (recurring_frequency.interval == 'Year') {
          var currentDate = lastInvoice
            ? moment(lastInvoice.invoice_date, 'YYYY-MM-DD').add(recurring_frequency.year_count, 'weeks')
            : recurring_frequency.start_date;
          while (moment.duration(moment(currentDate).diff(moment(today))).as('days') <= 0) {
            const date = moment(currentDate).format('YYYY-MM-DD');
            const due_date = getDueDate(payload.terms, date);
            recurring_invoices.push({...payload, due_date: due_date, invoice_date: date, is_recurring: true, recurring_template: _id, invoice_number: newInvoiceID,});
            currentDate = moment(currentDate).add(recurring_frequency.year_count, 'year');
            newInvoiceID = parseInt(newInvoiceID) + 1;
          }
        }
      } catch (error) {
        console.error(error.message);
      }
    })
  );

  try {
    let invoices = await invoiceService.insertInvoice(recurring_invoices);
    for (const invoice of invoices) {
      const isDuplicate = (await invoiceService.getInvoiceByNo(invoice.invoice_number)) < 1;
      if (!isDuplicate) {
        await invoiceController.updateInvoiceNoById(invoice)
       }
    }
  } catch (error) {
    console.log('#log', error);
    res.send({
      message: error.message,
    });
  }
};

const logActivity = async (userId, module, moduleInfo, action, data) => {
  const user = await userService.getUserById(userId);
  const activity = {user,module,module_info: moduleInfo,action,data,};
  await activityLogService.createLog(activity);
};

const createInvoiceTemplate = catchAsync(async (req, res) => {
  const { body } = req;
  const { items } = body;
  const invoiceTemplate = await RecurringInvoiceService.createInvoiceTemplate(body);
  await logActivity(req.user._id, 'invoice template', invoiceTemplate, 'user created a new Invoice Template', body);
  res.status(httpStatus.CREATED).send({data: invoiceTemplate});
});

module.exports = {
  createInvoiceTemplate,
  testCron,
};
