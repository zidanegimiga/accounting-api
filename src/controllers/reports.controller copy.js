const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ObjectId } = require('mongodb');
const _ = require('lodash')
const { reportService, companyService, activityLogService, userService, customersService, invoiceService, accountService, journalEntry, expenseService, billService, supplierService } = require('../services');

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

const getTrailBalance = catchAsync(async (req, res) => {
    const from_date = new Date(new Date(req.body.from_date).setHours(0, 0, 0, 0))
    const to_date = new Date(new Date(req.body.to_date).setHours(23, 59, 0, 0))
    const companyIds = req.body.company.map((id) => ObjectId(id));
    const filter = { is_deleted: 0, }
    const result = await reportService.getTrailBalance(filter, from_date, to_date, companyIds);

    if (result.trail_balance.length > 0) {
        let trailBalanceData = result.trail_balance
        trailBalanceData.map(item => {
            if (item.JE && item.JE.length > 0) {
                let amountData = item.JE[0]
                if (amountData.creditSum - amountData.debitSum > 0) {
                    item.isCreditAC = true
                    item.credit = Math.abs(amountData.creditSum - amountData.debitSum)
                    item.debit = 0
                } else {
                    item.isDebitAC = true
                    item.debit = Math.abs(amountData.creditSum - amountData.debitSum)
                    item.credit = 0
                }
            } else {
                item.isZeroAC = true
                item.credit = 0
                item.debit = 0
            }
        })
    }
    res.status(httpStatus.OK).send({ data: result.trail_balance });
});

const getAccountTransactionDetails = catchAsync(async (req, res) => {
    const accountID = ObjectId(req.params.id);
    const filter = { is_deleted: 0, _id: accountID };
    const companyIds = req.body.company.map((id) => ObjectId(id));
    const result = await reportService.getAccountTransactionDetails(filter,companyIds);

    let details = {
        date: "",
        transaction_type: "",
        customer_name: "",
        amount: "",
        balance: 0
    }
    if (result.account_details.length > 0) {
        let item = result.account_details[0]
        if (item.JE && item.JE.length > 0) {
            let accountDetails = item.JE
            for (let index = 0; index < accountDetails.length; index++) {
                const list = accountDetails[index];
                await customersService.getCustomerById(list.line_items.customer)
                    .then(async (resultCustomer) => {
                        details.date = list.createdAt
                        if (list.line_items.isCredit) {
                            list.line_items.amount = list.line_items.amount * -1
                        } else {
                            list.line_items.amount = list.line_items.amount * 1
                        }

                        if (list.isInvoiceRelated) {
                            details.transaction_type = "Invoice"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isPaymentRelated) {
                            details.transaction_type = "Payment"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isCreditNoteRelated) {
                            details.transaction_type = "Credit Note"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isExpenseRelated) {
                            details.transaction_type = "Expense"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isBillRelated) {
                            details.transaction_type = "Bill"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.manual) {
                            details.transaction_type = "Manual"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (resultCustomer) {
                            details.customer_name = resultCustomer.customer_name
                        } else {
                            await supplierService.getSupplierById(list.line_items.customer)
                            .then(resultSupplier => {
                                if (resultSupplier) {
                                    details.customer_name = resultSupplier.company_name
                                }else{
                                    if(list.manual){
                                        details.customer_name = "Manual"
                                    }else
                                    {

                                        details.customer_name = ""
                                    }
                                }
                            })
                        }
                        result.account_details[0].details[index] = _.cloneDeep(details)
                    })
            }
        }
        res.status(httpStatus.OK).send({ data: result.account_details });
    }
});

const getBalanceSheet = catchAsync(async (req, res) => {
    const from_date = new Date(new Date(req.body.from_date).setHours(0, 0, 0, 0))
    const to_date = new Date(new Date(req.body.to_date).setHours(23, 59, 0, 0))
    const companyIds = req.body.company.map((id) => ObjectId(id));
    const filter_pnl = { is_deleted: 0, is_balance_sheet: 0, level1: { $exists: true }};
    // const filter = { is_deleted: 0, is_balance_sheet: 0 };
    const result_pnl = await reportService.getProfitLoss(filter_pnl, from_date, to_date, companyIds);

    if (result_pnl.profit_loss.length > 0) {
        let profitLossData = result_pnl.profit_loss
        profitLossData.map(item => {
            if (item.JE && item.JE.length > 0) {
                let amountData = item.JE[0]
                item.amount = (amountData.creditSum + amountData.debitSum *-1)
            } else {
                item.amount = 0
            }
        })
    }
 
    let level1subtotal_pnl = groupBy(result_pnl.profit_loss, 'level1')
    let level1subtotalarr_pnl = []
    for (const key1 in level1subtotal_pnl) {
        const value1 = level1subtotal_pnl[key1]
        let obj = {}
        level1subtotal_pnl[key1] = {}
        obj['name'] = key1
        obj[`subtotal`] =(value1.map(b => b.amount).reduce((partialSum, a) => partialSum + a, 0))
        
        level1subtotalarr_pnl.push(obj)
    }


    console.log(level1subtotalarr_pnl,"------------level1subtotalarr_pnl")



    
    // const filter = { is_deleted: 0 , company: { $in: companyIds },level1 : {$exists : true}};
    const filter = { is_deleted: 0, is_balance_sheet: 1,  level2: { $exists: true }, };
    const result = await reportService.getBalanceSheet(filter, from_date, to_date, companyIds);

    if (result.balance_sheet.length > 0) {
        let balanceSheetData = result.balance_sheet
        balanceSheetData.map(item => {
            if (item.JE && item.JE.length > 0) {
                let amountData = item.JE[0]
                item.amount = amountData.creditSum + amountData.debitSum
            } else {
                item.amount = 0
            }
        })
    }
    let level2subtotal = groupBy(result.balance_sheet, 'level2')
    // console.log(level2subtotal,"------level2subtotal")
    let level2subtotalarr = []
    for (const key in level2subtotal) {
        const value = level2subtotal[key]
        if (key == "Shareholders' Equity"){
            // console.log(level2subtotal[key])
            let income, costOfSales, expense, net_earning_amount = 0
            for( let i =0 ; i < level1subtotalarr_pnl.length ; i++){
                console.log(level1subtotalarr_pnl[i].name)
                if(level1subtotalarr_pnl[i].name == "Income") {income = level1subtotalarr_pnl[i].subtotal}
                if(level1subtotalarr_pnl[i].name == "Cost of Sales") {costOfSales = Math.abs(level1subtotalarr_pnl[i].subtotal)}
                if(level1subtotalarr_pnl[i].name == "Expenses") {expense = Math.abs(level1subtotalarr_pnl[i].subtotal)}
                net_earning_amount =( income + costOfSales) + expense
                // console.log(income,costOfSales,expense)
                // console.log(net_earning_amount)
            }
            
            let net_earning = {
                name:"Net Earnings",
                amount:net_earning_amount,
                level1: "Liabilities & Shareholder's Equity",            
                level2: "Shareholders' Equity"
            }
            level2subtotal[key].push(net_earning)
        }
        let obj = {}
        obj['name'] = key
        obj[`subtotal`] = (value.map(b => b.amount).reduce((partialSum, a) => partialSum + a, 0))
        obj[`list`] = value
        obj['level1'] = value[0].level1
        level2subtotalarr.push(obj)
    }
    let level1subtotal = groupBy(level2subtotalarr, 'level1')
    let level1subtotalarr = []
    for (const key1 in level1subtotal) {
        const value1 = level1subtotal[key1]
        let obj = {}
        level1subtotal[key1] = {}
        obj['name'] = key1
        obj[`subtotal`] = Math.abs(value1.map(b => b.subtotal).reduce((partialSum, a) => partialSum + a, 0))
        obj[`list`] = value1
        level1subtotalarr.push(obj)
    }

    // .map((level2, id) => {
    //     console.log(level2,"------------level2")
    //     amount = _.sumBy(level2, "amount")
    // }) )

    res.status(httpStatus.OK).send({ data: result.balance_sheet, subtotal: level1subtotalarr });
});
function groupBy(arr, property) {
    return arr.reduce(function (memo, x) {
        if (!memo[x[property]]) { memo[x[property]] = []; }
        memo[x[property]].push(x);
        return memo;
    }, {});
};

const getBalanceSheetTransactionDetails = catchAsync(async (req, res) => {
    const accountID = ObjectId(req.params.id);
    const filter = { is_deleted: 0, _id: accountID };
    const result = await reportService.getAccountTransactionDetails(filter);
    let details = {
        date: "",
        transaction_type: "",
        customer_name: "",
        amount: "",
        balance: 0
    }
    if (result.account_details.length > 0) {
        let item = result.account_details[0]
        if (item.JE && item.JE.length > 0) {
            let trailBalanceDetails = item.JE
            for (let index = 0; index < trailBalanceDetails.length; index++) {
                const list = trailBalanceDetails[index];
                await customersService.getCustomerById(list.line_items.customer)
                    .then(resultCustomer => {
                        details.date = list.createdAt
                        if (list.line_items.isCredit) {
                            list.line_items.amount = list.line_items.amount * -1
                        } else {
                            list.line_items.amount = list.line_items.amount * 1
                        }

                        if (list.isInvoiceRelated) {
                            details.transaction_type = "Invoice"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isPaymentRelated) {
                            details.transaction_type = "Payment"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isCreditNoteRelated) {
                            details.transaction_type = "Credit Note"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isExpenseRelated) {
                            details.transaction_type = "Expense"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isBillRelated) {
                            details.transaction_type = "Bill"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (resultCustomer) {
                            details.customer_name = resultCustomer.customer_name
                        } else {
                            details.customer_name = ""
                        }
                        result.account_details[0].details[index] = _.cloneDeep(details)
                    })
            }
            res.status(httpStatus.OK).send({ data: result.account_details });
        }
    }
});

const getProfitLoss = catchAsync(async (req, res) => {
    const from_date = new Date(new Date(req.body.from_date).setHours(0, 0, 0, 0))
    const to_date = new Date(new Date(req.body.to_date).setHours(23, 59, 0, 0))
    const companyIds = req.body.company.map((id) => ObjectId(id));
    const filter = { is_deleted: 0, is_balance_sheet: 0 , level1: { $exists: true }};
    // const filter = { is_deleted: 0, is_balance_sheet: 0 };
    const result = await reportService.getProfitLoss(filter, from_date, to_date,companyIds);

    if (result.profit_loss.length > 0) {
        let profitLossData = result.profit_loss
        profitLossData.map(item => {
            if (item.JE && item.JE.length > 0) {
                let amountData = item.JE[0]
                item.amount = (amountData.creditSum + amountData.debitSum)*-1
            } else {
                item.amount = 0
            }
        })
    }

    // let level2subtotal =  groupBy(result.profit_loss,'level2')
    // let level2subtotalarr = []
    // for (const key in level2subtotal) {
    //     const value = level2subtotal[key]
    //     let obj = {}
    //     obj['name'] = key
    //     obj[`subtotal`] = value.map(b => b.amount).reduce((partialSum, a) => partialSum + a, 0)
    //     obj[`list`] = value
    //     obj['level1'] = value[0].level1
    //     level2subtotalarr.push(obj)
    // }   
    let level1subtotal = groupBy(result.profit_loss, 'level1')
    let level1subtotalarr = []
    for (const key1 in level1subtotal) {
        const value1 = level1subtotal[key1]
        let obj = {}
        level1subtotal[key1] = {}
        obj['name'] = key1
        obj[`subtotal`] = Math.abs(value1.map(b => b.amount).reduce((partialSum, a) => partialSum + a, 0))
        obj[`list`] = value1
        level1subtotalarr.push(obj)
    }

    res.status(httpStatus.OK).send({ data: result.profit_loss, subtotal: level1subtotalarr });
});

const getProfitLossTransactionDetails = catchAsync(async (req, res) => {
    const accountID = ObjectId(req.params.id);
    const filter = { is_deleted: 0, _id: accountID };
    const result = await reportService.getAccountTransactionDetails(filter);
    let details = {
        date: "",
        transaction_type: "",
        customer_name: "",
        amount: "",
        balance: 0
    }
    if (result.account_details.length > 0) {
        let item = result.account_details[0]
        if (item.JE && item.JE.length > 0) {
            let trailBalanceDetails = item.JE
            for (let index = 0; index < trailBalanceDetails.length; index++) {
                const list = trailBalanceDetails[index];
                await customersService.getCustomerById(list.line_items.customer)
                    .then(resultCustomer => {
                        details.date = list.createdAt
                        if (list.line_items.isCredit) {
                            list.line_items.amount = list.line_items.amount * -1
                        } else {
                            list.line_items.amount = list.line_items.amount * 1
                        }

                        if (list.isInvoiceRelated) {
                            details.transaction_type = "Invoice"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isPaymentRelated) {
                            details.transaction_type = "Payment"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isCreditNoteRelated) {
                            details.transaction_type = "Credit Note"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isExpenseRelated) {
                            details.transaction_type = "Expense"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (list.isBillRelated) {
                            details.transaction_type = "Bill"
                            details.amount = list.line_items.amount
                            details.balance = details.balance + details.amount
                        }
                        if (resultCustomer) {
                            details.customer_name = resultCustomer.customer_name
                        } else {
                            details.customer_name = ""
                        }
                        result.account_details[0].details[index] = _.cloneDeep(details)
                    })
            }
            res.status(httpStatus.OK).send({ data: result.account_details });
        }
    }
});

const getDashboardDetails = catchAsync(async (req, res) => {
    const days = req.body.days || 1
    // const level1 = req.body.level1 "level1" : "Expenses"
    let filterAccount = ""
    let filterInvoice = ""
    let filterDashboard = ""
    let previousDate = new Date(new Date(Date.now() - days * 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0));
    const companyIds = req.body.company.map((id) => ObjectId(id));
    /**
     * Invoice Widget
    */
    const filter = { void: false, write_off: false, company: { $in: companyIds } };
    const paid_invoice = await invoiceService.getPaidInvoice(filter);
    const unpaid_invoice = await invoiceService.getUnpaidInvoice(filter);
    const unpaid_invoice_by_customer = await invoiceService.getUnpaidInvoiceByCustomer(filter);
    // const partial_paid_invoice = await invoiceService.getPartialPaidInvoice(filter);
    //    const new_invoice = await invoiceService.getNewInvoice(filter,previousDate);

    /**
     * customer widget
     */
    filterInvoice = { company: { $in: companyIds } };
    const total_revenue_by_service = await invoiceService.getTotalRevenueByServiceGroup(filterInvoice)
    /**
     * Overview Widget
     * AP, AR, Income, Expense & Bill
     */
    filterDashboard = { is_deleted: 0, company: { $in: companyIds } };
    const ap_ar_amount = await journalEntry.getJournalByAccountId([ObjectId('63f8d58696314c555945a32d'), ObjectId('63f8d58696314c555945a32e')])
    let ap_ar_amt = 0
    if(paid_invoice.length > 0){
        ap_ar_amt = paid_invoice[0].total_amount
    }else{
        ap_ar_amt = 0
    }
    const income_amount = [{ name: "Income", amount: ap_ar_amt  }]

    const expense_amount = await expenseService.getExpenseTotal(filterDashboard)
    // const bill_amount = await billService.getBillTotal(filterDashboard)
    let exp_amt = 0
    if(expense_amount && expense_amount.total_amount ){
        exp_amt = expense_amount.total_amount
    }else{
        exp_amt = 0
    }
    const total_expense = [{ name: "Expense", amount: exp_amt }]
    const OverviewWidget = ap_ar_amount.concat(income_amount, total_expense)

    res.status(httpStatus.OK).send(
        {
            paid_invoice: paid_invoice,
            unpaid_invoice: unpaid_invoice,
            // new_invoice:new_invoice,
            unpaid_invoice_by_customer: unpaid_invoice_by_customer,
            total_revenue_by_service: total_revenue_by_service.invoices,
            OverviewWidget: OverviewWidget
        });
});

const getDashboardExpenseDetails = catchAsync(async (req, res) => {
    let filterAccount = ""
    const companyIds = req.body.company.map((id) => ObjectId(id));
    /**
    * Expense Widget
    */
    filterAccount = { level1: "Expenses" };
    const expense_account = await accountService.getLevel1AccountList(filterAccount);
    let expenseList = expense_account.map(a => a._id)
    filterAccount = { level1: "Cost of Sales" };
    const cost_of_sales_account = await accountService.getLevel1AccountList(filterAccount);
    let costOfSalesList = cost_of_sales_account.map(a => a._id)
    let accountList = expenseList.concat(costOfSalesList)
    const expense = await journalEntry.getJournalByAccountId(accountList);

    res.status(httpStatus.OK).send({ expense: expense });
});

module.exports = {
    getTrailBalance,
    getAccountTransactionDetails,
    getBalanceSheet,
    getBalanceSheetTransactionDetails,
    getProfitLoss,
    getProfitLossTransactionDetails,
    getDashboardDetails,
    getDashboardExpenseDetails,
};
