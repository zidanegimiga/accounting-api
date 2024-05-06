const express = require('express');
const authRouter = require('./auth.route');
const usersRouter = require('./user.route');
const customersRouter = require('./customers.route');
const accountsRouter = require('./accounts.route');
const companiesRouter = require('./companies.route');
const reportsRouter = require('./reports.route');
const taxCodeRouter = require('./taxCode.route');
const costCenterRouter = require('./costCenter.route');
const serviceRouter = require('./service.route');
const termRouter = require('./term.route');
const invoiceRouter = require('./invoice.route');
const invoiceTemplateRouter = require('./recurringInvoice.route');
const saleRouter = require('./sale.route')
const journalRouter = require('./journal.route')
const supplierRouter = require('./supplier.route')
const expenseRouter = require('./expense.route')
const billRouter = require('./bill.route')
const accountConfigRouter = require('./accountConfig.route')


const notificationsRouter = require('./notification.route');

const router = express.Router();

const defaultRoutes = [
  { path: '/auth', route: authRouter },
  { path: '/users', route: usersRouter },
  { path: '/notifications', route: notificationsRouter },
  { path: '/customer', route: customersRouter },
  { path: '/account', route: accountsRouter },
  { path: '/reports', route: reportsRouter },
  { path: '/company', route: companiesRouter },
  { path: '/tax-code', route: taxCodeRouter },
  { path: '/cost-center', route: costCenterRouter },
  { path: '/service', route: serviceRouter },
  { path: '/term', route: termRouter },
  { path: '/invoice', route: invoiceRouter },
  { path: '/invoice-template', route: invoiceTemplateRouter },
  { path: '/sale', route: saleRouter },
  { path: '/journal-entry', route: journalRouter },
  { path: '/supplier', route: supplierRouter },
  { path: '/expense', route: expenseRouter },
  { path: '/bill', route: billRouter },
  { path: '/account-config', route: accountConfigRouter },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
