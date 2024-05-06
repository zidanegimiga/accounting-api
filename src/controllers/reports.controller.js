const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { ObjectId } = require('mongodb');
const _ = require('lodash')
const pdf = require("pdf-creator-node");
const { reportService, companyService, activityLogService, userService, customersService, invoiceService, accountService, journalEntry, expenseService, billService, supplierService, accountConfigService, emailService } = require('../services');

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
    try {
        const accountID = ObjectId(req.params.id);
        const filter = { is_deleted: 0, _id: accountID };
        const companyIds = req.body.company.map((id) => ObjectId(id));
        let customerfilterBy = "none"

        if (req.body.customerfilterBy && req.body.customerfilterBy.length > 0) { customerfilterBy = req.body.customerfilterBy.map((id) => ObjectId(id)) }

        const result = await reportService.getAccountTransactionDetails(filter, companyIds, customerfilterBy);
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
                    console.log(list,"--------------list")
                    console.log(list.line_items.customer,"----------list.line_items.customer")
                    await customersService.getCustomerSupplierById(list.line_items.customer)
                        .then(async (resultCustomer) => {
                            console.log(resultCustomer,"-------------resultCustomer")
                            details.date = list.createdAt
                            if (list.line_items.isCredit) {
                                list.line_items.amount = list.line_items.amount * -1
                            } else {
                                list.line_items.amount = list.line_items.amount * 1
                            }
                            /**check the JE type */
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
                                if(!resultCustomer.hasOwnProperty(resultCustomer.customer_name)){
                                            details.customer_name = resultCustomer.company_name
                                }else{
                                    details.customer_name = resultCustomer.customer_name
                                }
                            } 
                            // else {
                            //     await supplierService.getSupplierById(list.line_items.customer)
                            //         .then(resultSupplier => {
                            //             if (resultSupplier) {
                            //                 details.customer_name = resultSupplier.company_name
                            //             } else {
                            //                 if (list.manual) {
                            //                     details.customer_name = "Manual"
                            //                 } else {
                            //                     details.customer_name = ""
                            //                 }
                            //             }
                            //         })
                            // }
                            result.account_details[0].details[index] = _.cloneDeep(details)
                        })
                        .catch(e => console.log(e,"--------------------einner"))
                }
            }
            res.status(httpStatus.OK).send({ data: result.account_details });
        }
    } catch (e) {
        res.status(httpStatus.OK).send({ data: [] });
    }
});

const sendEmail = catchAsync(async (req, res) => {
  res.status(httpStatus.CREATED).send({ data: {} });
  });
/**
 * merge account config and accounts collection
 * use parent id to get the tree structure
 * convert the parentId object to string type for matching the filter
     const arrayToTree = (arr, parent = '0') =>
        arr
        .filter(item => item.parentID === parent)
        .map(child => 
            ({ ...child, children: arrayToTree(arr,child.id) })
        );

 */

const getBalanceSheet = catchAsync(async (req, res) => {
    const from_date = new Date(new Date(req.body.from_date).setHours(0, 0, 0, 0))
    const to_date = new Date(new Date(req.body.to_date).setHours(23, 59, 0, 0))
    const companyIds = req.body.company.map((id) => ObjectId(id));
    const filter_pnl = { is_deleted: 0, is_balance_sheet: false };
    const filter_balancesheet = { is_deleted: 0, is_balance_sheet: true }
    const reportPeriodBy = "none"
    let customerfilterBy = "none"
    // let customerfilterBy = [ObjectId('63e496ee78d83b80d34ab0f1')]
    if (req.body.customerfilterBy && req.body.customerfilterBy.length > 0) { customerfilterBy = req.body.customerfilterBy.map((id) => ObjectId(id)) }
    // const filter = { is_deleted: 0, is_balance_sheet: 0 };

    /**
     * get p&l data
     */
    const result_pnl = await reportService.getProfitLoss(filter_pnl, from_date, to_date, companyIds, reportPeriodBy, customerfilterBy);
    // console.log(result_pnl,"------------result_pnl")

    const ac_config_array_pnl = await accountConfigService.getAccountConfigList(filter_pnl);

    // console.log(COA,"-------------COA")

    if (result_pnl.profit_loss.length > 0) {
        let profitLossData = result_pnl.profit_loss
        profitLossData.map(item => {
            if (item.JE && item.JE.length > 0) {
                for (let i = 0; i < item.JE.length; i++) {
                    let amountData = item.JE[i]
                    item.amount = amountData.creditSum + amountData.debitSum + item.amount
                }
            } else {
                item.amount = 0
            }
        })
    }
    let COA_pnl = ac_config_array_pnl.accounts.concat(result_pnl.profit_loss)
    const arrayToTree = (arr, parent = '0') =>
        arr
            .filter(item => item.parentID === parent)
            .map(child =>
                ({ ...child, children: arrayToTree(arr, child.id) })
            );

    let pnl_tree = arrayToTree(COA_pnl)
    for (let i = 0; i < pnl_tree.length; i++) {
        updateScore(pnl_tree[i])
    }

    let income_amount = 0
    let cost_of_sales_amount = 0
    let expense_amount = 0
    let net_earning_amount = 0
    for (let i = 0; i < pnl_tree.length; i++) {
        // console.log(pnl_tree[i].subtotal)
        if (pnl_tree[i].name == 'Income') income_amount = pnl_tree[i].subtotal
        if (pnl_tree[i].name == 'Cost of Sales') cost_of_sales_amount = pnl_tree[i].subtotal
        if (pnl_tree[i].name == 'Expenses') expense_amount = pnl_tree[i].subtotal
    }
    net_earning_amount = [Math.abs(income_amount) - Math.abs(cost_of_sales_amount)] - Math.abs(expense_amount)
    // console.log(net_earning_amount,"-----------net_earning_amount") 

    /**
     * Balance Sheet
     */
    const result = await reportService.getBalanceSheet(filter_balancesheet, from_date, to_date, companyIds, reportPeriodBy, customerfilterBy);
    const ac_config_array_bs = await accountConfigService.getAccountConfigList(filter_balancesheet);

    // console.log(result,"------------result")
    // // res.status(httpStatus.OK).send({ data: result.balance_sheet});
    if (result.balance_sheet.length > 0) {
        let balanceSheetData = result.balance_sheet
        balanceSheetData.map(item => {
            if (item.JE && item.JE.length > 0) {
                for (let i = 0; i < item.JE.length; i++) {
                    let amountData = item.JE[i]
                    item.amount = amountData.creditSum + amountData.debitSum + item.amount
                }
            } else {
                item.amount = 0
            }
        })
    }
    // console.log(ac_config_array_bs)
    let COA_bs = ac_config_array_bs.accounts.concat(result.balance_sheet)
    let bs_tree = arrayToTree(COA_bs)
    function updateScore(n) {
        n.subtotal = 0
        if (n.children.length <= 0) {
            if (n.name == "Net Earnings") {
                // console.log(n,"------------n")
                n.subtotal = net_earning_amount
                return n.subtotal
            }
            if (n.amount) {
                n.subtotal = n.amount
                return n.subtotal
            }
            else {
                return 0
            }
        }
        else {
            n.children.forEach(function (c) {
                var r = updateScore(c);
                //if (!r) 
                // console.log(n.['JE']);
                if (n.amount) {
                    var st = n.amount +  r
                    n.subtotal += st
                }
                else {
                    n.subtotal += r;
                }
            });
            return n.subtotal;
        }
    }

    for (let i = 0; i < bs_tree.length; i++) {
        if (bs_tree[i] == "Owners Equity") {
            bs_tree[i].children[0].children.forEach(element => {
                if (element.name == "Net Earnings") {
                    // console.log(element, "-----------element")
                    element.amount = net_earning_amount
                }
            });
        }
        updateScore(bs_tree[i])
    }

    // // res.status(httpStatus.OK).send({ data: result.balance_sheet});
    res.status(httpStatus.OK).send({ data: bs_tree , COA_pnl:COA_pnl});
});

// function arrayToTree(arr, parent = '0') {
//     arr
//         .filter(item => item.parentID === parent)
//         .map(child =>
//             ({ ...child, children: arrayToTree(arr, child.id) })
//         );
// }

// function groupBy(arr, property) {
//     return arr.reduce(function (memo, x) {
//         if (!memo[x[property]]) { memo[x[property]] = []; }
//         memo[x[property]].push(x);
//         return memo;
//     }, {});
// };

const getProfitLoss = catchAsync(async (req, res) => {
    const from_date = new Date(new Date(req.body.from_date).setHours(0, 0, 0, 0))
    const to_date = new Date(new Date(req.body.to_date).setHours(23, 59, 0, 0))
    const companyIds = req.body.company.map((id) => ObjectId(id));
    const filter_pnl = { is_deleted: 0, is_balance_sheet: false };
    const reportPeriodBy = "none"
    let customerfilterBy = "none"
    // const filter = { is_deleted: 0, is_balance_sheet: 0 };
    if (req.body.customerfilterBy && req.body.customerfilterBy.length > 0) { customerfilterBy = req.body.customerfilterBy.map((id) => ObjectId(id)) }

    const result_pnl = await reportService.getProfitLoss(filter_pnl, from_date, to_date, companyIds, reportPeriodBy, customerfilterBy);
    // console.log(result, "----------------result")
    const ac_config_array_pnl = await accountConfigService.getAccountConfigList(filter_pnl);

    if (result_pnl.profit_loss.length > 0) {
        let profitLossData = result_pnl.profit_loss
        profitLossData.map(item => {
            if (item.JE && item.JE.length > 0) {
                for (let i = 0; i < item.JE.length; i++) {
                    let amountData = item.JE[i]
                    item.amount = amountData.creditSum + amountData.debitSum + item.amount
                }
            } else {
                item.amount = 0
            }
        })
    }
    let COA_pnl = ac_config_array_pnl.accounts.concat(result_pnl.profit_loss)
    const arrayToTree = (arr, parent = '0') =>
        arr
            .filter(item => item.parentID === parent)
            .map(child =>
                ({ ...child, children: arrayToTree(arr, child.id) })
            );
    function updateScore(n) {
        n.subtotal = 0
        if (n.children.length <= 0) {
            if (n.name == "Net Earnings") {
                // console.log(n,"------------n")
                n.subtotal = net_earning_amount
                return n.subtotal
            }
            if (n.amount) {
                n.subtotal = n.amount
                return n.subtotal
            }
            else {
                return 0
            }
        }
        else {
            n.children.forEach(function (c) {
                var r = updateScore(c);
                //if (!r) console.log(n);
                if (n.amount) {
                    var st = n.amount +  r
                    n.subtotal += st
                }
                else {
                    n.subtotal += r;
                }
            });
            return n.subtotal;
        }
    }
    let pnl_tree = arrayToTree(COA_pnl)
    for (let i = 0; i < pnl_tree.length; i++) {
        updateScore(pnl_tree[i])
    }

    res.status(httpStatus.OK).send({ data: pnl_tree });
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
    if (paid_invoice.length > 0) {
        ap_ar_amt = paid_invoice[0].total_amount
    } else {
        ap_ar_amt = 0
    }
    const income_amount = [{ name: "Income", amount: ap_ar_amt }]

    const expense_amount = await expenseService.getExpenseTotal(filterDashboard)
    const bill_amount = await billService.getBillTotal(filterDashboard)
    let exp_amt = 0
    if (expense_amount && expense_amount.total_amount) {
        if (bill_amount && bill_amount.total_amount) {
            exp_amt = expense_amount.total_amount + bill_amount.total_amount
        }
        else {
            exp_amt = expense_amount.total_amount
        }
    } else {
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


    const from_date = new Date(new Date('01-01-2000').setHours(0, 0, 0, 0))
    const to_date = new Date(new Date('01-01-2050').setHours(23, 59, 0, 0))
    const companyIds = req.body.company.map((id) => ObjectId(id));
    const filter_pnl = { is_deleted: 0, is_balance_sheet: false };
    const reportPeriodBy = "none"
    let customerfilterBy = "none"
    // const filter = { is_deleted: 0, is_balance_sheet: 0 };
    if (req.body.customerfilterBy && req.body.customerfilterBy.length > 0) { customerfilterBy = req.body.customerfilterBy.map((id) => ObjectId(id)) }

    const result_pnl = await reportService.getProfitLoss(filter_pnl, from_date, to_date, companyIds, reportPeriodBy, customerfilterBy);
    // console.log(result, "----------------result")
    const ac_config_array_pnl = await accountConfigService.getAccountConfigList(filter_pnl);

    if (result_pnl.profit_loss.length > 0) {
        let profitLossData = result_pnl.profit_loss
        profitLossData.map(item => {
            if (item.JE && item.JE.length > 0) {
                for (let i = 0; i < item.JE.length; i++) {
                    let amountData = item.JE[i]
                    item.amount = amountData.creditSum + amountData.debitSum + item.amount
                }
            } else {
                item.amount = 0
            }
        })
    }
    let COA_pnl = ac_config_array_pnl.accounts.concat(result_pnl.profit_loss)
    const arrayToTree = (arr, parent = '0') =>
        arr
            .filter(item => item.parentID === parent)
            .map(child =>
                ({ ...child, children: arrayToTree(arr, child.id) })
            );
    
            function updateScore(n) {
                
                if (n.children.length <= 0) {
                    newarr.push(ObjectId(n._id))
                }
                else {
                    n.children.forEach(function (c) {
                        var r = updateScore(c);
                        //if (!r) console.log(n);
                       
                    });
                    
                }
            }
            let pnl_tree = arrayToTree(COA_pnl)
            let newarr = []
            for (let i = 0; i < pnl_tree.length; i++) {
                if (pnl_tree[i].name != "Income") updateScore(pnl_tree[i])
            }
        

    /**
    * Expense Widget
    */
    

    


    // let filterAccount = ""
    // filterAccount = { level1: "Expenses" };
    // const expense_account = await accountService.getLevel1AccountList(filterAccount);
    // let expenseList = expense_account.map(a => a._id)
    // filterAccount = { level1: "Cost of Sales" };
    // const cost_of_sales_account = await accountService.getLevel1AccountList(filterAccount);
    // let costOfSalesList = cost_of_sales_account.map(a => a._id)
    // let accountList = expenseList.concat(costOfSalesList)
    // console.log(newarr,"------------newarr")
    const expense = await journalEntry.getJournalByAccountId(newarr);

    res.status(httpStatus.OK).send({ expense: expense });
});


const getVatReport = catchAsync(async (req, res) => {
    try {
        const from_date = new Date(new Date(req.body.from_date).setHours(0, 0, 0, 0))
        const to_date = new Date(new Date(req.body.to_date).setHours(23, 59, 0, 0))
        const companyIds = req.body.company.map((id) => ObjectId(id));
        const filter = { is_deleted: 0, company: { $in: companyIds }, code: "VP" };

        // const sales_result = await reportService.getVatReport(filter, from_date, to_date, companyIds, true);
        const sales_result_invat = await reportService.getVatReport(filter, from_date, to_date, companyIds, true, "INVAT");
        const sales_result_exvat = await reportService.getVatReport(filter, from_date, to_date, companyIds, true, "");
        const expense_result = await reportService.getVatReport(filter, from_date, to_date, companyIds, false, "");
        // res.status(httpStatus.OK).send({  sales_result_invat:sales_result_invat,sales_result_exvat:sales_result_exvat });

        // console.log(sales_result, expense_result, "-----------sales_total")
        let sales_vat_total = 0
        let sales_net_total = 0
        sales_result_invat.vat_report.forEach((element) => {sales_vat_total = element.vatAmount + sales_vat_total,sales_net_total = element.netAmount + sales_net_total})
        sales_result_exvat.vat_report.forEach((element) => {sales_vat_total = element.vatAmount + sales_vat_total,sales_net_total = element.netAmount + sales_net_total})
        let expense_vat_total = 0
        let expense_net_total = 0
        expense_result.vat_report.forEach(element => {expense_vat_total = element.vatAmount + expense_vat_total,expense_net_total  = element.netAmount + expense_net_total  })
        const vat_result = Math.abs(sales_vat_total) - Math.abs(expense_vat_total)
        res.status(httpStatus.OK).send({ output_sales_result_invat:sales_result_invat, output_sales_result_exvat:sales_result_exvat, input_invat:expense_result,  net:vat_result,  sales_vat_total:sales_vat_total, sales_net_total:sales_net_total, expense_vat_total:expense_vat_total, expense_net_total:expense_net_total});

    } catch (e) {
        console.log(e,"---------------")
        res.status(httpStatus.OK).send({ data: [] });
    }
});

const getVatReportDetails = catchAsync(async (req, res) => {
    try {
        const from_date = new Date(new Date(req.body.from_date).setHours(0, 0, 0, 0))
        const to_date = new Date(new Date(req.body.to_date).setHours(23, 59, 0, 0))
        const companyIds = req.body.company.map((id) => ObjectId(id));
        const filter = { is_deleted: 0, company: { $in: companyIds }, code: "VP" };
        const isCredit = req.body.isCredit
        const typeTaxData = req.body.typeTaxData
        const cityData = req.body.cityData

        // const sales_result = await reportService.getVatReport(filter, from_date, to_date, companyIds, true);
        const report_details = await reportService.getVatReportDetails(filter, from_date, to_date, companyIds, isCredit, typeTaxData, cityData);
       
        res.status(httpStatus.OK).send({ report_details : report_details});

    } catch (e) {
        console.log(e,"---------------")
        res.status(httpStatus.OK).send({ data: [] });
    }
});

const generatePDF = catchAsync(async (req, res) => {
    try {
        
        const body = req.body
        var options = {
            format: "A4",
            orientation: "portrait",
            border: {
                "top": "0px",            // default is 0, units: mm, cm, in, px
                "right": "5mm",
                "bottom": "5mm",
                "left": "0px"
              }
        };
        var document = {
            html: body.content,
            data: {

            },
            path: "./output.pdf",
            type: "",
        };
        pdf.create(document, options).then((pdf_res) => {
                
            res.download(pdf_res['filename'])
        }).catch((error) => {
            console.log("#log", error);
            res.status(httpStatus.OK).send({ data: [] });
        });
    } catch (e) {
        console.log("#log", e);
        res.status(httpStatus.OK).send({ data: [] });
    }

});


module.exports = {
    getTrailBalance,
    getAccountTransactionDetails,
    getBalanceSheet,
    getProfitLoss,
    getDashboardDetails,
    getDashboardExpenseDetails,
    getVatReport,
    generatePDF,
    sendEmail,
    getVatReportDetails
};
