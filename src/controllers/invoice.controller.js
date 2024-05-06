const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const {
  invoiceService,
  activityLogService,
  userService,
  productService,
  emailService,
  accountService,
  customersService,
  companyService,
} = require('../services');
const { ObjectId } = require('mongodb');
const { createInvoiceJournalEntry } = require('../controllers/journalEntry.controller');
const { getInfoByAccount } = require('../controllers/service.controller');
const ApiError = require('../utils/ApiError');
const moment = require('moment');
const pdf = require('html-pdf');
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfMake.vfs = pdfFonts.pdfMake.vfs;
const AWS = require('aws-sdk');
const Handlebars = require('handlebars');
const crypto = require('crypto');
const { getInfo } = require('./service.controller');
const cron = require('node-cron');
const { brotliDecompressSync } = require('zlib');
const fs = require('fs');

function twoDecimalsAndPositive(value) {
  let val = 0.0;
  if (value && Number(value) !== 0) {
    if (typeof value == 'string') {
      value = Math.abs(Number(value));
    } else if (typeof value == 'number') {
      value = Math.abs(value);
    }

    let newValue = parseFloat(value).toFixed(2);
    const numberFormatter = Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });
    const formatted = numberFormatter.format(newValue);
    val = formatted;
  } else if (Number(value) == 0) {
    val = 0.0;
  } else val = 0.0;
  return val;
}

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

const logInvoiceActivity = async (invoice, userId, module, moduleInfo, action, data) => {
  const user = await userService.getUserById(userId);
  const invoiceActivity = {
    invoice,
    user,
    module,
    module_info: moduleInfo,
    action,
    data,
  };
  await activityLogService.createInvoiceLog(invoiceActivity);
};

const addInvoice = async (body, user, no) => {
  const { items, total, email, journal_entry, sub_total, vat_total, invoice_date, due_date, tax_item } = body;
  const due = moment(due_date);
  const today = moment();
  let invoice_status = today.isAfter(due) ? 'Overdue' : 'Due';
  let newInvoiceID;
  const lastInvoice = await invoiceService.getLastInvoice();
  if (!lastInvoice) {
    newInvoiceID = 1000;
  } else {
    newInvoiceID = parseInt(lastInvoice.invoice_number) + 1;
  }
  const payload = {
    ...body,
    invoice_number: newInvoiceID,
    status: invoice_status,
    balance_due: total,
  };
  const invoice = await invoiceService.createInvoice(payload);
  const productItems = items.filter((item) => item.type == 'Product' && item.isInventory);
  productItems.forEach(async (item) => {
    const product = await productService.updateProductCount(ObjectId(item.service));
    user && (await logActivity(user, 'product', product, 'user Updated product quantity', body));
  });

  const updatedJournalEntry = journal_entry.map((obj) => ({
    ...obj,
    account: ObjectId(obj.account),
    customer: ObjectId(obj.customer),
  }));
  const journal_payload = {
    line_items: updatedJournalEntry,
    sub_total,
    vat_total,
    total,
    journal_date: invoice_date,
    isInvoiceRelated: true,
    invoice: invoice.invoice._id,
    company: invoice.invoice.company,
    tax_item: tax_item,
  };

  const test = await createInvoiceJournalEntry(journal_payload, user);
  const invoice_generated = await uploadInvoiceFileToS3(newInvoiceID, invoice.invoice);
  return invoice_generated;
};

const uploadInvoiceFileToS3 = async (newInvoiceID, invoice,payment_made) => {
  return new Promise(async (resolve, reject) => {
    let {
      items,
      total,
      _id,
      balance_due,
      terms_condition,
      invoice_date,
      invoice_number,
      due_date,
      sub_total,
      vat_total,
      terms_name,
      customer_name,
      customer_address,
      customer_trn,
      status
    } = invoice;
    total = twoDecimalsAndPositive(total);
    balance_due = twoDecimalsAndPositive(balance_due);
    sub_total = twoDecimalsAndPositive(sub_total);
    vat_total = twoDecimalsAndPositive(vat_total);

    const uniqueHex = crypto.randomBytes(5).toString('hex');
    const fileName = !invoice.invoice_path
      ? `invoice-${uniqueHex}-${newInvoiceID}.pdf`
      : `invoice-${uniqueHex}-${invoice.invoice_path.length}-${newInvoiceID}.pdf`;
    const activities = [];
    items.forEach((item) => {
      activities.push([
        {
          stack: [
            // second column consists of paragraphs
            {
              text: item.service_name,
              fontSize: 9,
              bold: true,
            },
            {
              text: item.description,
              style: 'subHeader',
            },
          ],
          fontSize: 9,
        },
        {
          text: item.quantity,
          style: 'subheader',
        },
        {
          text: item.rate,
          style: 'subheader',
        },
        {
          text: item.discount,
          style: 'subheader',
        },
        {
          text: item.amount,
          style: 'subheader',
          alignment: 'right',
          margin: [0, 0, 10, 0],
        },
        {
          text: item.vat_amount,
          style: 'subheader',
          alignment: 'right',
          margin: [0, 0, 10, 0],
        },
        {
          text: item.net_total,
          style: 'subheader',
          alignment: 'right',
          margin: [0, 0, 10, 0],
        },
      ]);
    });

    var dd = {
      pageSize: 'A4',
      pageMargins: [40, 50, 40, 150],
      content: [
        {
          columns: [
            {
              stack: [
                {
                  text: 'Eat and Drink Restaurant',
                  margin: [0, 0, 0, 0],
                  bold: true,
                  fontSize: 11,
                },
                {
                  text: 'Levels 41 & 42, Emirates Towers',
                  style: 'header',
                },
                {
                  text: 'Sheikh Zayed Rd - Dubai',
                  style: 'header',
                },
                // {
                //   text: '+97144210105',
                //   style: 'header',
                // },
                {
                  text: 'eatanddrink@gmail.com',
                  style: 'header',
                },
                {
                  text: 'TRN 100317375200003',
                  style: 'header',
                },
              ],
            },
            {
              image:
                'data:image/png;base64,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v3VWcKJu1jZagTiiWAfhokX5NatPzJULxUKlMgtAOSjioWPHuFHPObvQodFqdpW6K9MTnqcgloxVSARvDQkzK7BqmLjQ0THcqjWL+eLaVfVU4LXs2CM7+0Sxs544xYAwiBSRECcGtcnehYTEEZxxBAq8BlvTmfWWLpudq6bjeOTFF3uUFyaPIMdJE/KM86WJXYZ0ALhmBKKkofx6xeucVdw85lfmbzko8tLhv/zgR6VSevMlW9/59l/72re/uWbjdsQ2lfFhow//mw+2THPXnj3XLbhmw4YNn/3sZ2+55ZYX9uzr7i79yq987L/95CXdGwAAIABJREFUt/9+zVVXzZTL3V1dp06dCjx/wZKegYHDzzzz1PYdl9tm9Kbrr/38l764/8C+hx99rLd39UMPPP/ht7+DbReQTedLXr4DKR+awRpytjvNa5x+wq0khkA74zmjnGFACNPVuStuuP7Kj/8OOnMJTaMtdhU5eD6a8egX/uHezx4lR0qEE9AImOctih25s2/ZxKuwLcEqROwZpYMFXWv//e+uLWYwPDryV18Y27lLIoE4YcXiFDk2opksnGOwR7PN2hSct2rZdR94H664AEv6MVtZc821OD784z/59Pj+oz1aKWPUqyyV+d538n0RO5GWVpe855dwww3nBj7EQivIfJOqVoMz2PfCiQceHHzyyYmh08ty+ag6GzATaSRVomMmbSEAKw6NcLkRb77k8sJ73oX+xRidOPLjO0qOLcfqZZAt1RZRncfdESDOCTPDlSv12azadvllHR/4AJTCM8/hc5/H0BBHFuIcv6Jloc503knaLa82DOIsXZFfOF7HpXKWuky7IeZADorC7s7b3vu+3lIepdzE3gMbVmweOHji3q//843vutNF5oEHH1q6fPnhI4d3XLZjwaIlF1x08Ve++vVSqYuU99CDj9zxrndfedXlH//d3xs6PTJ48lQ2HQ4Nnt675/ny9OyLe1+87MorqvX64w8+uKK//8TBAd1XuGzbVYWgd9/uIyPjey688s1+qYh8Di5C0gWhV53TJ+eaeHCf0cNxnnO+ddrFBILyHCubCtDXhawH7UEUrMAKLKHWQipwqVB8zWK1c5wgOajdAbPkRDsjjua/SA/kBETCyThAZKZSG08r9JTQmYaJq5ob1maVJ7GGODhHAp9IE1rOCcF6aqZlqh25i+64FW+9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',
              width: 100,
            },
          ],
        },
        {
          text: 'Tax Invoice',
          margin: [0, 15, 0, 0],
          fontSize: 23,
          style: 'green',
        },
        {
          margin: [0, 15, 0, 0],
          layout: 'noBorders',
          table: {
            widths: ['*', 'auto', '300'],
            body: [
              [
                {
                  text: 'BILL TO',
                  fontSize: 10,
                  bold: true,
                },
                {
                  text: 'INVOICE NO:',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${invoice_number}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
              [
                {
                  rowSpan: 3,
                  margin: [0, 5, 0, 0],
                  fontSize: 9,
                  stack: [
                    // second column consists of paragraphs
                    {
                      text: `${customer_name}`,
                    },
                    {
                      text: `${customer_address}`,
                    },
                    {
                      text: `TRN-87678`,
                    },
                  ],
                },
                {
                  text: 'DATE',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${moment(invoice_date).format('DD-MM-YYYY')}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
              [
                '',
                {
                  text: 'DUE DATE',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${moment(due_date).format('DD-MM-YYYY')}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
              [
                '',
                {
                  text: 'PAYMENT TERMS',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${terms_name}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
            ],
          },
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 15,
              x2: 515,
              y2: 15,
              lineWidth: 3,
              color: '#25baa2',
            },
          ],
        },
        {
          margin: [0, 40, 0, 0],
          layout: 'noBorders',
          table: {
            widths: ['*', 50, 50, 50, 50, 50, 60],
            body: [
              [
                {
                  text: 'PRODUCT/SERVICE',
                  fontSize: 10,
                  bold: true,
                  fillColor: '#C6DEEF',
                  style: 'green',
                },
                {
                  text: 'QTY',
                  style: 'green',
                  fontSize: 10,
                  bold: true,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'RATE',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'DISCOUNT AMOUNT',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'NET AMOUNT',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'TAX AMOUNT',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'TOTAL AMOUNT',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                  alignment: 'right',
                  margin: [0, 0, 10, 0],
                },
              ],
              ...activities,
            ],
          },
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 15,
              x2: 515,
              y2: 15,
              lineWidth: 1,
              dash: {
                length: 2,
              },
              lineColor: 'gray',
            },
          ],
        },
        {
          margin: [0, 10, 0, 0],
          layout: 'noBorders',
          table: {
            widths: ['*', 100, 150],
            body: [
              [
                {
                  text: '',
                  fontSize: 10,
                },
                {
                  stack: [
                    // second column consists of paragraphs
                    {
                      text: 'SUB TOTAL',
                      fontSize: 9,
                    },
                    {
                      text: 'VAT TOTAL',
                      fontSize: 9,
                    },
                    {
                      text: 'TOTAL',
                      style: 'subHeader',
                    },
                    {
                      text: 'Payment Made',
                      fontSize: ( status== 'Partially Paid')?9:0,
                      style:( status== 'Partially Paid') ? 'subHeader' :null,
                      opacity: ( status== 'Partially Paid') ? 1 : 0
                  },
                    {
                      text: 'BALANCE DUE',
                      style: 'subHeader',
                      
                    },
                  ],
                  fontSize: 9,
                },
                {
                  stack: [
                    // second column consists of paragraphs
                    {
                      text: `${sub_total}`,
                      fontSize: 9,
                    },
                    {
                      text: `${vat_total}`,
                      fontSize: 9,
                    },
                    {
                      text: `${total}`,
                      fontSize: 9,
                    },
                    {
                      text: `AED ${payment_made}`,
                      fontSize: ( status== 'Partially Paid')?9:0,
                      bold: true,
                      style:( status== 'Partially Paid') ? 'subHeader' :null,
                      opacity: ( status== 'Partially Paid') ? 1 : 0
                    },
                    {
                      text: `AED ${balance_due}`,
                      fontSize: 12,
                      bold: true,
                      style: 'subHeader',
                    },
                  ],
                  fontSize: 9,
                  alignment: 'right',
                  margin: [0, 0, 10, 0],
                },
              ],
            ],
          },
        },
      ],
      footer: {
        margin: [20, 0, 0, 0],
        stack: [
          {
            text: 'Terms and Conditions',
            style: 'small',
            bold: true,
            margin: [0, 0, 0, 10],
          },
          {
            text: `The following terminology applies to these Terms and Conditions. Privacy Statement and Disclaimer Notice and all Agreements:`,
            style: 'small',
          },
          {
            text: `'Client', 'You and 'Your' refers to you, the person log on this website and complaint to the Company's terms and conditions.`,
            style: 'small',
          },
          {
            text: `The Company". "Ourselves". "We". "Our" and "Us"`,
            style: 'small',
            margin: [0, 0, 0, 10],
          },
          {
            text: 'Kindly pay the above amount by: Cheque or Bank Transfer (Please provide proof of payment)',
            style: 'small',
            bold: true,
            margin: [0, 0, 0, 10],
          },
          {
            text: 'Name of Beneficiary: Eat and Drink Restaurant',
            style: 'small',
          },
          {
            text: 'Bank Name: Emirates Islamic Bank PJSC',
            style: 'small',
          },
          {
            text: 'A/C No: 5708239930  (AED Account)',
            style: 'small',
          },
          {
            text: 'IBAN number (or swift code/BIC code): AE990340003708239930',
            style: 'small',
          },
          {
            text: 'Swift Code: MEBLAEAD',
            style: 'small',
            margin: [0, 0, 0, 10],
          },
          {
            text: 'This is a system generated invoice and does not require signature.',
            style: 'small',
            margin: [0, 0, 0, 5],
          },
        ],
      },
      styles: {
        header: {
          fontSize: 9,
        },
        subheader: {
          fontSize: 9,
        },
        small: {
          fontSize: 8,
        },
        superMargin: {
          margin: [20, 0, 40, 0],
          fontSize: 15,
        },
        green: {
          color: '#3480B9',
        },
      },
    };

    const s3 = new AWS.S3({
      accessKeyId: process.env.SECRET_ID_AWS,
      secretAccessKey: process.env.SECRET_KEY_AWS,
    });

    const file = await generateInvoiceFile(dd, fileName);
    let fileStream = fs.readFileSync(fileName);
    const params = {
      Bucket: process.env.BUCKET_NAME + '/invoice',
      Key: fileName,
      Body: fileStream,
      ACL: 'public-read',
      ContentType: 'application/pdf',
    };

    try {
      const result = await s3.upload(params).promise();
      const newInvoicePath = {status: 1,path: result.Location};
      invoice.invoice_path && (invoice.invoice_path.forEach((path) => { path.status = 0}))
      invoice.invoice_path.unshift(newInvoicePath);
      const invoice_generated = await invoiceService.updateInvoiceById(_id, { invoice_path: invoice.invoice_path });
      fs.rmSync(`./${fileName}`, {
        force: true,
      });
      resolve({
        success: true,
        invoice: invoice_generated,
      });
    } catch (err) {
      throw new ApiError(httpStatus.NOT_FOUND, err);
    }
  });
};

const generateInvoiceFile = (dd, fileName) => {
  const pdfDocGenerator = pdfMake.createPdf(dd);
  return new Promise((resolve, reject) => {
    pdfDocGenerator.getBuffer((buffer) => {
      fs.writeFileSync(fileName, buffer);
      resolve(buffer);
    });
  });
};

const createInvoice = catchAsync(async (req, res) => {
  var validJournal = false;
  const { body } = req;
  const { journal_entry } = body;
  const debitsTotal = journal_entry.filter((item) => item.isDebit).reduce((total, item) => total + parseInt(item.amount), 0);
  const creditsTotal = journal_entry
    .filter((item) => item.isCredit)
    .reduce((total, item) => total + parseInt(item.amount), 0);
  if (debitsTotal == creditsTotal) {
    validJournal = true;
  } else {
    throw new ApiError(httpStatus.FORBIDDEN, 'journal entry not matching');
  }

  if (validJournal) {
    const data = await addInvoice(body, req.user._id);
    let result;
    let invoiceInfo = data.invoice;
    if (body.mailInvoice) {
      const { invoice_number, customer_name, total, invoice_date, due_date, customer, company, _id } = invoiceInfo;
      const companyInfo = await companyService.getCompanyById(company);
      // const { email, invoice_path } = invoice.invoice;
      // const link = invoice_path.find((item) => item.status == 1);
      // await emailService.sentInvoiceEmail(email, body.emailDraft.text, body.emailDraft.subject, link.path);

      const template = `<div style=\"background: #fbfbfb;\"><div><div style=\"padding: 2% 3%;max-width: 150px;max-height:50px;\"></div></div><div style=\"padding:3%;text-align:center;background: #4190f2;\"> <div style=\"color:#fff;font-size:20px;font-weight:500;\">Invoice &nbsp; #${invoice_number}</div></div><div style=\"max-width:560px;margin:auto;padding: 0 3%;\"><div style=\"padding: 30px 0; color: #555;line-height: 1.7;\">Dear ${customer_name}, <br><br>Thank you for your business. Your invoice can be viewed, printed and downloaded as PDF from the link below.<br></div><div style=\"padding: 3%; background: #fefff1; border: 1px solid #e8deb5; color: #333;\"><div style=\"padding: 0 3% 3%; border-bottom: 1px solid #e8deb5; text-align: center;\"><h4 style=\"margin-bottom: 0;\">INVOICE AMOUNT</h4><h2 style=\"color: #D61916; margin-top: 10px;\">AED${total}</h2></div><div style=\"margin:auto; max-width:350px; padding: 3%;\"> <p><span style=\"width: 40%; padding-left: 10%; float:left; \">Invoice No</span><span style=\"width:40%; padding-left: 10%; display: inline-block;\"><b>${invoice_number}</b></span></p><p><span style=\"width: 40%; padding-left: 10%; float:left; \">Invoice Date</span><span style=\"width:40%; padding-left: 10%;\"><b>${invoice_date}</b></span></p><p><span style=\"width: 40%; padding-left: 10%; float:left; \">Due Date</span><span style=\"width: 40%; padding-left: 10%;\"><b>${due_date}</b></span></p> </div> <br> <div style=\"padding: 3% 0;line-height: 1.6;\"> Regards, <div style=\"color: #8c8c8c; font-weight: 400\"> ${req.user.first_name}</div><div style=\"color: #b1b1b1\">${companyInfo.company_name}</div></div></div> </div><br><br>`;
      const customerInfo = await customersService.getCustomerMailInfo(customer);
      const emailObj = {
        from: req.user.email,
        send_to: customerInfo.primary_contact.email,
        cc: customerInfo.email ? customerInfo.email : null,
        Subject: `Invoice - ${invoice_number} from company`,
        emailTemplate: template,
        invoiceId: _id,
      };
      result = emailObj;
    } else {
      result = {
        success: true,
      };
    }
    await logInvoiceActivity(data.invoice._id, req.user._id, 'invoice', data.invoice, 'user created a new Invoice', body);
    res.status(httpStatus.CREATED).send({
      data: result,
    });
  }
});

const getAll = catchAsync(async (req, res) => {
  const { status, deleted, from_date, to_date, customer, search, limit, page } = req.query;
  const companyIds = req.body.company.map((id) => ObjectId(id));
  let customerIds = [];
  if (customer.length > 0) customerIds = customer.map((id) => ObjectId(id));
  const filter = {
    is_deleted: 0,
    company: {
      $in: companyIds,
    },
  };
  deleted.length && (filter.is_deleted = deleted ? 1 : 0);
  status.length && (filter.status = status);
  customer.length &&
    (filter.customer = {
      $in: customerIds,
    });
  from_date.length &&
    to_date.length &&
    (filter.createdAt = {
      $gte: from_date,
      $lte: to_date,
    });
  const result = await invoiceService.queryInvoice(filter, search, limit, page);
  res.status(httpStatus.OK).send({
    data: result,
  });
});

const updateInvoiceNoById = async (id) => {
  const lastInvoice = await invoiceService.getLastInvoice();
  newInvoiceID = parseInt(lastInvoice.invoice_number) + 1;
  const result = await invoiceService.updateInvoiceById(id, {
    invoice_number: newInvoiceID,
  });
  return result;
};

const getInvoiceById = catchAsync(async (req, res) => {
  const result = await invoiceService.getInvoiceById(req.params.id);
  res.status(httpStatus.OK).send({
    data: {
      invoice: result,
    },
  });
});

const updateInvoice = catchAsync(async (req, res) => {
  const { accounts, amount, customer, ...payload } = req.body;
  const result = await invoiceService.updateInvoiceById(req.params.id, payload);
  await logInvoiceActivity(result._id, req.user._id, 'invoice', result, 'user updated invoice', req.body);
  // if (req.body.write_off || req.body.void_reason) {
  //   await createJournalEntry(req.body, req.params.id, req.user._id);
  // }
  res.status(httpStatus.OK).send({
    data: result,
  });
});

const createJournalEntry = async (body, invoiceId, user) => {
  const { accounts, customer, amount, sub_total, vat_total, total, company } = body;
  // Convert customer and _id fields to ObjectId in all objects of accounts array
  const updatedAccounts = accounts.map((account) => {
    return {
      ...account,
      customer: ObjectId(account.customer),
      account: ObjectId(account.account),
    };
  });
  let line_items = updatedAccounts;
  if (body.write_off) {
    const AccountInfo = await accountService.getAccountByCode({
      code: 'BD',
      company: ObjectId(company),
    });
    if (AccountInfo) {
      const item = {
        account: AccountInfo._id,
        customer: ObjectId(customer),
        isDebit: true,
        isCredit: false,
        amount: amount,
      };
      line_items.push(item);
    }
  }
  const journal_payload = {
    line_items: line_items,
    sub_total,
    vat_total,
    total,
    journal_date: new Date(),
    isInvoiceRelated: true,
    invoice: invoiceId,
    company: company,
  };
  const result = await createInvoiceJournalEntry(journal_payload, user);
  return result;
};

const recordPayment = catchAsync(async (req, res) => {
  const { body } = req;
  const { _id, ...newBody } = body;
  const { isInvoice, deposit_to, amount } = body;
  const { accounts, sub_total, vat_total, total, ...payload } = newBody;
  const payment = await invoiceService.recordPayment(payload);
  if (isInvoice) {
    const invoiceId = ObjectId(body.invoice);
    const invoice = await invoiceService.getInvoiceById(invoiceId);
    if (invoice) {
      let payload;
      if (invoice.balance_due == newBody.amount) {
        payload = {
          paid: true,
          balance_due: 0,
          status: 'Paid',
        };
      } else {
        payload = {
          balance_due: invoice.balance_due - newBody.amount,
          status: 'Partially Paid',
        };
      }
      const result = await invoiceService.updateInvoiceById(invoiceId, payload);
      const invoice_generated = await uploadInvoiceFileToS3(result.invoice_number, result,amount);
      await logInvoiceActivity(result._id, req.user._id, 'invoice', result, 'user updated invoice', req.body);
    }
  } else {
    const debitId = ObjectId(body.debit_note);
    const debtNote = await invoiceService.getDebitNoteById(debitId);
    if (debtNote) {
      let payload;
      if (debtNote.balance_due == body.amount) {
        payload = {
          paid: true,
          balance_due: 0,
          status: 'Paid',
        };
      } else {
        payload = {
          balance_due: debtNote.balance_due - body.amount,
          status: 'Partially Paid',
        };
      }
      const debtInfo = await invoiceService.updateDebitNoteId(debitId, payload);
      await logActivity(req.user._id, 'debit note', debtInfo, 'user updated debit note', body);
    }
  }
  await createPaymentJournalEntry(body, deposit_to, payment.payment._id, req.user._id);
  await logActivity(req.user._id, 'payment', payment, 'user recorded payment', body);
  res.status(httpStatus.CREATED).send({
    data: payment,
  });
});

const createPaymentJournalEntry = async (body, depositAccount, paymentId, user) => {
  const { accounts, customer, amount, payment_date, sub_total, vat_total, total, company } = body;
  const depositAccountInfo = await accountService.getAccountById(depositAccount);

  // Convert customer and _id fields to ObjectId in all objects of accounts array
  const updatedAccounts = accounts.map((account) => {
    return {
      ...account,
      customer: ObjectId(account.customer),
      account: ObjectId(account.account),
    };
  });

  let line_items = updatedAccounts;
  if (depositAccountInfo) {
    const item = {
      account: depositAccountInfo._id,
      customer: ObjectId(customer),
      isDebit: true,
      isCredit: false,
      amount: amount,
    };
    line_items.push(item);
  }

  const journal_payload = {
    line_items: line_items,
    sub_total,
    vat_total,
    total,
    journal_date: payment_date,
    isPaymentRelated: true,
    payment: paymentId,
    company: company,
  };
  const result = await createInvoiceJournalEntry(journal_payload, user);
  return [];
};

const createCreditNote = catchAsync(async (req, res) => {
  let result;
  let updatedInvoice;
  let newCreditID;
  const lastCreditNote = await invoiceService.getLastCreditNote();
  if (!lastCreditNote) {
    newCreditID = 'CN-1000';
  } else {
    newCreditID = 'CN-' + (parseInt(lastCreditNote.credit_note_number.split('-')[1]) + 1);
  }
  const { body } = req;
  const { journal_entry, ...payload } = body;
  result = await invoiceService.createCreditNote({
    ...payload,
    credit_note_number: newCreditID,
  });
  const invoiceId = ObjectId(body.invoice);
  const invoice = await invoiceService.getInvoiceById(invoiceId);
  if (invoice) {
    const { balance_due, items, credit_amount } = invoice;
    let updatedItems = body.items;
    items.forEach((item1) => {
      let creditData = item1.credit_info ? item1.credit_info : [];
      updatedItems.forEach((item2) => {
        if (item1.service === item2.service) {
          item1.credit_info = creditData.concat(item2);
        }
      });
    });

    var invoice_payload = {
      credit_applied: true,
      balance_due: balance_due - body.total,
      items: items,
      credit_amount: credit_amount + body.total,
    };
    updatedInvoice = await invoiceService.updateInvoiceById(invoiceId, invoice_payload);
    await logInvoiceActivity(updatedInvoice._id, req.user._id, 'invoice', updatedInvoice, 'user updated invoice', payload);
  }
  const updatedJournalEntry = journal_entry.map((obj) => ({
    ...obj,
    account: ObjectId(obj.account),
    customer: ObjectId(obj.customer),
  }));
  const journal_payload = {
    line_items: updatedJournalEntry,
    sub_total: body.sub_total,
    vat_total: body.vat_total,
    total: body.total,
    journal_date: new Date(),
    isCreditNoteRelated: true,
    credit_note: result.creditNote._id,
    company: body.company,
  };
  await createInvoiceJournalEntry(journal_payload, req.user._id);
  const updatedData = await uploadCreditNoteFileToS3(updatedInvoice, result.creditNote);
  await logActivity(req.user._id, 'credit note', result, 'user recorded credit note', body);
  res.status(httpStatus.OK).send({
    data: updatedData.creditNote,
  });
});

const uploadCreditNoteFileToS3 = async (invoice, credit_note) => {
  return new Promise(async (resolve, reject) => {
    const {
      invoice_number,
      invoice_date,
      terms_condition,
      customer_name,
      customer_address,
      customer_trn,
      terms_name,
      due_date,
    } = invoice;
    let { credit_note_number, balance_due, items, sub_total, total, createdAt, vat_total } = credit_note;

    total = twoDecimalsAndPositive(total);
    balance_due = twoDecimalsAndPositive(balance_due);
    sub_total = twoDecimalsAndPositive(sub_total);
    vat_total = twoDecimalsAndPositive(vat_total);

    const uniqueHex = crypto.randomBytes(5).toString('hex');
    const fileName = `DB-${uniqueHex}-${credit_note_number}.pdf`;
    const activities = [];
    items.forEach((item) => {
      activities.push([
        {
          stack: [
            // second column consists of paragraphs
            {
              text: item.service_name,
              fontSize: 9,
              bold: true,
            },
            {
              text: item.description,
              style: 'subHeader',
            },
          ],
          fontSize: 9,
        },
        {
          text: item.quantity,
          style: 'subheader',
        },
        {
          text: item.rate,
          style: 'subheader',
        },
        {
          text: item.tax,
          style: 'subheader',
          alignment: 'right',
          margin: [0, 0, 10, 0],
        },
        {
          text: item.amount,
          style: 'subheader',
          alignment: 'right',
          margin: [0, 0, 10, 0],
        },
      ]);
    });

    var dd = {
      pageSize: 'A4',
      pageMargins: [40, 50, 40, 150],
      content: [
        {
          columns: [
            {
              stack: [
                {
                  text: 'Eat and Drink Restaurant',
                  margin: [0, 0, 0, 0],
                  bold: true,
                  fontSize: 11,
                },
                {
                  text: 'Levels 41 & 42, Emirates Towers',
                  style: 'header',
                },
                {
                  text: 'Sheikh Zayed Rd - Dubai',
                  style: 'header',
                },
                // {
                //   text: '+97144210105',
                //   style: 'header',
                // },
                {
                  text: 'eatanddrink@gmail.com',
                  style: 'header',
                },
                {
                  text: 'TRN 100317375200003',
                  style: 'header',
                },
              ],
            },
            {
              image:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQ4AAACKCAIAAADUhTOIAAAgAElEQVR4nOy9d5Rdx3kn+Pu+qnvvix3R3ehGaGSQAAmAJJhFSkzKlinLkse21h77yLOzszvjPbuz47Oe452d4Dkz492xfcZer8M4yAqWJSuRlCgmiRlgAgMIAiRyRuful26o+r79475uNAg0BZKgJM/27zT6NN677926VfXlUKSqWMQiFvHDwD/uASxiEX8/sEgqi1jERWGRVBaxiIvCIqksYhEXhUVSWcQiLgqLpLKIRVwUFkllEYu4KCySyiIWcVFYJJVFLOKisEgqi1jERWGRVBaxiIvCIqksYhEXhUVSWcQiLgqLpLKIRVwUFkllEYu4KCySyiIWcVFYJJVFLOKisEgqi1jERWGRVBaxiIvCIqksYhEXhUVSWcQiLgqLpLKIRVwUFkllEYu4KNgf9wB+YpC3Q6P8PwJglo/IAh/4MXGZt9u2jd6TUfxwzJvP+TP4tmft3T+vLvD628SiVDkX+vbXZhH//8CiVJkFnU8kIgD/pHGTt8sdf1xS6GK/py3ALyi7+R2MR88RZe/kGxYALTZiPYu5mSDBWbXhJ4xU3ibe7ugXUjffDc7OKwCAz7uJ5C9fCAuPX97izXel8i2ARVKZxfxpoHyq1c/+RSAAOu8iXWAJ3mvT4G2t1nmWwlksJC3nX00XuuMFB3D+U89/ZR6pKEHpvCEpQDBz00sghRJIIbTgjJ4VGwySs1amEsjMo6T5due7waICdi4IALx3ZGwM34LzUA/NV1EX2KgLL+c7xFuw9oXGMB/zyYDgF7zqh936fAYx//W3HAAI5rwbKCAMyW+ioHPJlWd3tjIIAMPMfhvPjm1udAK4eU/B+R8CEpDPXCWIQjBAl1AlWCSVWdA8pdmYGPLcoddGUW+F6q0SEQBj56ZLGMLaXjnRS6y26AJbUQi4EF9vKzYXIiJdYLPo29lFKqJeDBGzyafinHdV9bwZsDpva3kPAKIAIDnpsnduPrmSMityHSf/TdRWeUjalzHP3dqBzpKKCDEZgL2H0SieqK8dWLZlzWUFgBR83oDfGRZJ5QIQmBaSh156+v6XnqhHaWLd/CXML2HI+YoEAJVLo9DKAuu7EBXRArflCxGQ5Dvs3K9qmxDzaCu/gNpb3JEohFTVOcfa/gYR55VUlUTnVB5SGGlLCVaBCNqzx+KFiCCaZV6gpAyAFaSsQiBR1fYciiZJQiJzI2HlttgjaZOKMsDiwcwAJKNyWNG6u2nT1X/yn34vkIBnBeD5FP52sUgqc2hvEecyb4MmZMQ3zuh0Q9NMcgY2y9QJmNUicszxP1HlSyTyFyKVBUEXlioLbhFlBYQkv4YhRgXt7cj560JQVcPUaDaiKPDiugvVxkwzSbJCWCQiBVLOFCxCTNyWLeItBEosaqHIUp+lURTVao2oUPLEokrqvXi2oYFxaQpRdgaAwAPixTMEnkiVSASagVSIPViF4HIVQMFQK8SsgAdBWDHdSrWVptoEvOGAhaAAaL4a+c7IZpFUzoUCYA84cGolMZJYlxmHWXZ+VgWiC5MKFlCE3hbeNp0sfNO32BYKyKyTlhVGPSlAxPCACAkTgSQTktAH1SierI3XJipRVUiicnV0fCIqlByLkoDIqxUlghB5ryAio+JdQiYthZSm01291XqcpsLEhqEc2mazaTgolwqtepyzGAGURMnlUpxIScVDPQggVYjCQgARAhRzJM0QVgjAnAo7IScQD29USVlBs4bPO8ciqVwAOmvL6qzLBufaCULnuHiI2q/nCto72OjnD+BtgRa+KV/odZkNIum8V4QsK6BMAENIIfAqzrCJCpRk08MrOtLTp0Ka6h5afWai0dFZamWubaYrKTkFARD2AEAqEGt9oK5SCUMuHD92ik2FbcF5KFGWJlG1yMr1WmzYODAAbROFtN0oUG0PNbfYCYAjAWRWtjsApAxhITBYhVQ95nkjZq98t6vy9zto8B5BVefLa6Hz6GQ2rN/+odko//lvvaOftz3ghd/KB/+mH+AsC2g/sKiKelWQsIoRWJWCZgVNWRtxY2RJlT71kVvKmLxqw8DtN1/ZnDrTnBm3EIZjFZAjOEbKSBkO5JQdGTjy11y35brrNn3y47eH1LLSspoGlLG2CtZL0kxb9dCC2INSUApyOZXO6bekucQTVqGcYICzfuD8U2dfb3+wbVtCVEVVL0lE5CdIqrR1GLqwN+liJOis0QeFmgX3z0VxBwujqmxYmeY4M83nTnzWkG5fI0qgS2XWvy28iWHOKYQqigXHo/N+wxCBXEelktaaFlIMQ0ni1sxYM51asnxJ2fqeqLm8kzrRLCTTw33Vss2cI2M0EY2KxXozKRYqDBGXplnsnXb09MVx3Kwnp0+eoTAtNBvXbdr04u79zWZarlScb9Rrjb6lq1VMs9VyWVotFrMsy7xGxVKr6SNbmhkbMUEoScqgQhAWi5UkS51Xn8GpBIERiqMwEA8lKykba12WAVBVyg0x5C7otksm10XfsX3/E0Qqb408JvUjupeqkIrKxe77/LJLw7zeCfRdqhciwjCQuD5ekNRqahJtjpzcsKp/2zW3FpZ073zmSTRm4tGTgUNr8mTgxtPJ09VyZ9yoFaOoOeGjqNM4SevTIWlWm1ATTmWNakdPR8Hue2HHBEtrafnTP/vfnTpyyGdN34xv2Lb2qm3XnBhpPvHUM2k64eKZcrFbmFsa+lSTekMKce9gd1ybATyLL4XZmcPHit2hsSWgWKkUm8lYGs8YZwiRNd3FUkcrzYgJ5MVmYAKI2o6x3KH8bif57w2p4EdLLXNgPeuHVTonADw3lJxRtRWwSyRVLhnRLTRhubeKGCrGGIIzSDWeCILaxuEl29avmjxFa4b6t1y5+th0fa+kXhB5BB7VArR59PJV2LBx+enR6bBcaTmz7/DEyKkjnVYGeyvbb78uM9F3n3x1YupYRLJuaekj21dtXrVioNeG8UgFWLtu+Ffuvrmz2vXY06+3Th2KAvz6P/5kVzn86lfue+PoNEdLujoKraTeaExVIopbte1b1//Ux9534tihYycnHnj45SyeanmEBXz4o5sG+pbveu7g88+dyMhTGJFhVe+9eHEezkOczjk83q2t8feJVPAjoBaCkIBI0dZy58zlhQIamBdvUXmLq95DvNVNL4LmvPgAzpIrR3L7tZuvWNUT+VqXg4lPHHi59t3vv5wk6O/qGqpUCwxKk1VLe371Mx903rKNwFTsXPI7v/dfJfB9ZfzaL9w5MT3O1c4fPNXsKbE0G7ddd9U1G7qmThzsGBqQJtIpDFTTgk788e/90egESsCn7t6ybX155syJK4YL+/bUC3w6balx2Lih2lGyJzJMn3jjlR3Thv37rr6+apKHH9lXq+GXPn3l+g1rMykf3HPQIK10FJtpZqz1XojIMBtYAhFRO+fgXfOeHxupnJOZo/NfO/tHnmflBZaNqmNi7zJjg9zTwkIAiOfsE/h5cWsFvWOtVETJKJjUqJLorEfyh4Iu6G96R7iYL5oTd2/yFNPsO0oXDtcLnc1zAxGRJcmspFl97LJl16UTJ1w8VR89aVU2X79+ZYcdG3WFtO5nRlYsCfp6e6WevvLM81PTtfHJtJXiVz73iavWVsar0yuWlqw7PX7moNYnrUmb9cZwV+Hy4b64dnz09H7atP6OW6qnp5riT508ufeWW9Y9/tT+1cP44PXDzz31zZVDA32V+q3XwoMtdHh5//tv3h4366/tO7DrhWPZyMiZCWSj37nppmtplNjgfRv6XnntBVNeEbGzgRebiHglBhPnPrxzUnI4j/TPN/Hf7vb4cUqVi5GIBAK5mXqtWCySODasUMXZp1RV0Dmhap0VAHOW3MVD2tsrv/ds3sqPqzrq4vAOwjisb34oUrCKJhl5s/Gyq0ZOHl626vKezu5arXHXJ34+4NJzO5+ru+KHP/M5a4mj6JqbPt6IG31Lqvfd+81WM/v0z/xMo9FsNmuVjq7hoHMiDcuV6ZkDjQmNUy0uHVx/zfLVMya67q6PFSs9jbjps3iwUFi++eaZsTMpmU1Xbu/tqQ6u3batGVWqSyJxVuOXnn3i6JGjv/jL/+jW9zXiVuZFnGtt3rRhy+arpicn+/oGSuXVLdN93yNfUBNk3uf6hqqIkArppdY+fmykco48yTflnElwloiEwEoyNjG+dHBwfHx85dJlDHJ5+Oxs7LytldE5HwPeEbW8CUJvpXr95GD+1j8b5/lhn+LZeJCqEJk1G7cWulZ+4RsP7j95qpGk07VWuVQmpxBiR8VnTzeTuFotN2ZqUcgi9U/91Aevve0zoxNjf/XH9x48MlpLUagExpaFizPNoNw9nEX2T+99cXL0IESyDL09HePjMwCyDN6hWrUBuzDFqiH++U9/5lv3PvTci2ME+CZWLTP/5Nd+6datn/wvn3/wm/e80LcEzDh+DJ/+1HXjo6PP7Dw0No6wACpwpXsQ3JumIZiUGCpYMEP0XeFHSirzPUTn7+A8BSGFn71IABhoAjdWH69qz6npsYGlSxWeYA2IiXFWkVvQhnn31PLfPEhBCJ2mPYPrXjkwcWQ6OJ102mJHubtoySSNmjoxCOpEXLWnavXuoZXNZs1w8s1HX23cVHl978GXDzUQ9tquroY34qk2lUZhNQiChvhG03F1fbNZD6JgxpSbZrq3u8fVauqyNCo049qG4e4rrt+2d5T2nMgattpZ7qWocWIq/l9/6y82rl/5xoGjXQNdGpkrt23jyr4v3fPM0oFBdAxWA/IaiKHJukdQyrLUEhGdVbHkUpez/khJhYiSJLHGEtNUbaYQhERaKBSSLHXqMnFqTR1OCdYYqB8bG33p5ZeuuXa7rwan47EjU8cqM9VqVClHhQhBAONFnCCO4+5KhzgX2RAiAmE2Mi9zdj6h/DcTc1VRTRIYUyxXGo0GAKgaa4nItVqljo5mo5H/F4BzjigPh+cCXAGQIa/OsAGswgpVn3nxCANeTcYDjVi5pUZTowYwYAOwiqotjc5koJA8GMHfPrzHgKhr3UyrKS3j1YRBpdhpssynacZKIGMQMEVQ05xBFPTO1NRQpaujOD4yrj4cmQq+/cCLp08dC6Kis2Y6hUG1Wu0vBI1Dp1um3FNLXC1Ja4kgLJd7ByYapCh4G6kY52PPxJoR5xF6ImIiIiKet+xzvHIu4vQO8KNWwKyxomLJdnR0pC4z1v7tvd/adOXla4fXktC3v3Nv3bU2XbF55PSpM8dOpEnS398/eWrk2Injp0dPO5XRMyMrhlZs33rV0VNHChwNL18zMT1+4tjxqzdfWbQhA17lR+5P/lEj3wpkiK3Nd0YQBFmaRkEYRVGz1SoUS5aYiUJrVciLRDZgZjbGO5dlLs9qZ1Jim3+jSuAo9FBl9bknz3tpO74tAAErGFCF5inAQmDlFJYVpC4llCpl5qA+FZejUmhVrU9aTZGMyCqMUQtVIYF6BaUZE0eEMHFRbaoZFYea9UZHZ3ezmXofJKYMYaKAEYNTUHL/A9+HBmwqUdSlVMh84CFCxLnyySTsLTEWCGG/e/yoFTAv3lrrRGIX2yiaRsK91VdPHi4tXVIJglarUS4Uihlu3XTNwE0fJHDu2Lpx+WYuBk2XjMzMfP/pJ56Y3HFmbHTp4GDv0IoDRw8v7e1LXZY1465yldrrqZdQ57ogF/px0WPOF8ULVI0xIi5pOhsEEI2CcGZ8HGxKnZ1pnEC0NTUNE7IxQlQqlbzzPnMQsYE1QSCStdOlFJ4hxGqEWBSZeqfIiEg5EGH1bWeSkihoLslSCCD2uZ8lCJKk5bMGYmrUPGwYBdYY4YC9d6pKSsQCiLJ6IHOeIoYXl3mXaTmsGM/ZjJHYiudW6jUFCww5ppSQVYMyKMpckNY9rCdjwEIgJVIomTw+fynX/U34EZHKXMzOucSGNsvSva+/xsVwaN3wqrUrdjz1xOmjvesHBj+2/frly1Zguj596MTIxN6usOjiRDJVQi1p9C4fXNHb9Svv/yBKhWaWSBBONxu7nn/u6q3bVg0uC8PIi0ee46SSO0kvifeWzqEWvkBlSJuTzfGzebpfzsDPY3XvzFVACqhaZk8imawZGl67ck2lUjl04I3XX39j88qNy65fliTJ7n17aq72/tvuCouFA4cO7TtwcLpRq41P9fX2bVi/eVnf4MnTp09MjZyaOGNC00oTzVPYyRBTXqfL7ZQYArxjhjC1K1943mTYvFxEyRMQGM4azcGewa1XX1MpdB86cvSNI2/MJHUTqYBAohCQkLatR3HOgK0xkviyFgYLA1feupmcQgMlLkQllcyQRDaxlIikSZJUO3sV4ch0897vPpCRpzyTTQnMxAoRwMzmfOlPsK2yAO9VVSXKNDVkmCgqFeKs5eFXrF/54iu7ju04YlV+7q47+qIKxmpPf/u7J6YbR19+dfLIiakjJ0KRpN4wIGNsBrHV0vLL16299uqBKy7v37I53LCmUip94q47Xnx1z+Fjh9etWu8NucwxMxFbVtU8PZzaMZh8ey4YvT7/LQHEKmWaJ7iCrDEwmiCKoiRJhIQD431miJhUDRGpE6hIu2IJxpCx1gLSimMAhkhFyULabiclu1CZIreLqihPH2QGRTZqNuoCEMgmum1w089e/zMBzA/k+/UD4zesvvqDm+6so/lfz/z5jr1P/fQ1d5ZQmdjU+B9/63+z5WKh0hGfqX347ltvHNreQvwv//Lfn069iQIAbA00Lxak0JQ0TUhtuRRNTE0JIayUE2QsUIF4AcEQVEjyfGZlAxBlITGcXWp7fuPufxyh8ui+Z/6vP/2DiEqpS7mdwuiViFQNCF4l80TKnrPx5pUrNv7uv/wPg5197NFZ6HIgD3IQggbwBK/wGbIAgYd9/tir37vvASF4eGUFE0hFfB5CMiCdtVXmPD0XdO3M1Vq+9b6ew3ssVeb8v6JkyMGpOhuYxMdstLenY/rUyTuvvx711lN/9keNfQd3f/+J5OTI6u4lg4I1hcCmLurtCk3I1rZ83Eji+p7dr+x+8QeB9m/dMnzzdds/8fHLNm0qZMmuV185dfxEX99AsVBePrQstMZlqWUGca6M5cUMFzfm+XtXAGEVBSk4soGmSBpxs+HCYkjGuCSlgFRVyEMVoNkNDhLurHaSk/HTo6QIC4EJgyxJrTFIxTmnlsUwRC+cKP8miBKQuKRULGdJIkkWacQpGVCAQtzIfMt3R5UKSgKPGF3VrhC2hPB0fbS/1NUwapxSRqWE+lCeBrjprdcsSdtJhEzscs0r5kwMkMw0jSgxZ4iZTJ4O165HUCYQCwsUYFJhiFG2jiJnywgrKEbehmqZAgZIUwAKPz/d1BKrB6W6fmj1b/6z/2XzkjVeUjYUggDPsAo/29LAABQgBNgj86pCogQlAWS2amu2ID/PRTo7cXypXDnvDanMdzKQKEBkHcSpT1zr2Zefi4rh0NIlJ/bv/eAV28Yee/qh/+dPsoOH9fTYZTYYGOhrTk6KS9WLFRhjKAiMsQVyVl2PNRpYV4wOvfTsM7uefPXBe+/4lV/e8KmfG6he+8y+Azt27Ni8ZWtff28YGKa2M2RuIO0YwkLbcsHXHchZBMwc1xsRFZb1DZYL5Yna5GRrBgZ5MeBca4Y8RJpvqbjeqFC0umuwGBbHG1O12kxgQWnW39mtEUbq07HzGhmFXkBRnNPZ2qSb30RYxHosXTI4NTqz8/nnnn7ueRTDOIujgL74d3/7xZm/qXR2TAdxnbJ/8R9+q1osV2y1JEERJOJamRTIWJgigqzZUufT1CMKWBkOlFGYcdFTqBSJdnZ2xsgmG7WRyemwXAazo9lalHlTyipz3VFy2WvPNqCQC9W1ty9ma+E9RC9bt3bL2k0ZmhP1id//8z/Ze/hAK0s5sEmSeOeobSOh1WoZE3Qu6T1TG22FLjfliTg3tyivtGHGRbPEt4v3VqoowUMnp6c7OztHxkYr3VUY09PT2aqP9QZdN64eePorf/HcV7+xLHEd042h3qptxkWZKVYADskyg1qNpkFsLbHP+rqqPku8i1utqQ0ls76n9/XRw1/6P37j2peeu/Wzn3v/Ddf29/cnQXjk5PGhvqX9Hd3kz/GG5UG6t1UMxxBVT6wqPm05eN6+bevP3fmzRVP4+ve//dhzT7kwSDUBQUXVgtVTm72BwfFU87qtW37lEz8fwH7le19/9OlHwzAsRvZnbvnIug3rj9Um/uZ73zo8dkwvoq9bnssURmFrqlFUu2V4w4d+6UORrXztvnufP/xaw7VY6cMfufuWLTfv2//GV3/wrdHmSE2AFt5/8y03bLu2kTa/e/93dp0a1dQBjkClqBho0FRHAJwE3hZTDlvYsmrDLdu2X75mnVM3HTf2Hjrw0r49ew7tjy0SKwL1s3QwV4OrbftwLqqsBDXU1nmYSM/WZqkoiIRBbJgMMbmVg8sMFJCv3/f1L3/rK5X+3thnQRTGzVaapm3diYnIJHFWaY5PJ3UwMVlWyNnwyXtIJDkuNamc77Qm09XZrdAzo6PHR0+vWbViuG/pyPRI79SpH3zjL5756tcu7+0eispRf2eQGW1xuVqq1aaVICSWTdl0ROR93GBRa+qRigF1kHFqYm5u6YvWDHW+9tj9f/363o//03++cvvND7346uEzpz/2kY+X4kY1KIp4orxlQntKPdRcnPsq52cMwBPAURS6qWSJ6VhjBgoIV3YNRMamLiNLIAKRqHioUgZmUmNApSDq1OJKDBlQj+mwmQkLpK3ktq039XJvb3niPjxgYIU8M/vM0fn9gPKRzIbWsjjprFTTkdqyQu+2aJ2B3VGsPt9ohaxFDlf0Dw6iu7zuskef+f4xD1uOfCybVm24oro2Rrx/yeArqRRtgcEGQeYl9UKRYYV1FMaypjz4i3d/6ubLr+pAWEZhOp003YWbB7dN3/iRrz1wz7d2PDKetQrdHdNJU1RyacEKD0+q3DalCULzplcA8eJI/axppkSkoqqQzAdB4HxcqZRDWICWDa1YNbwmNlpi8tByoQxASNoRIWJ16tSVqqU4jmu1RpamQSmEMZk4IjJEPF/hv1Bc5d3gPZEqZzNtAQFOjp48cOCNq6/d/uTTO1cP9Vc0Xl22X/6dfzP56nM/fcu28WOn6k7jaoVQzFLf7OiIO0qqSqSGYF2LWpNdpaDCWjbKXolIRL36kKgEdHAWFMsHs4nvff4PN0ycuemOj0Ylu3/fqytv/IBXsDIR0bkpTxcfv2dlEoYRgEnZCBe86YANYSOHwIMXbrNlhANPkVAZxsAG3hphVjbCoecqlwqYKYoNiL1RZiPmopiiqOabuwhrYAoOViVTz5BQqAgTewQidpbXBoIIzDChkhUYkIUx8BBlhSFS1YqNlpQqn7n9Ex+8/JYiuIggRnMgXNpAg0BdVPqlD33GB+arj3739OikqUbQPMD/Fj4mWYjH5yKIId6LZWYmDjiFBAjef9Otqy/beHxkVAzJbNx9rtSPiFTIew/KsiQ7fuTII48/tvPF5wtdZU9QktyDcz6zuVS5Gu+5s1jgunu6iqOV1/fvnxgd6++o0sTIg3/3V/XXd92wcXVjpumrA83iYO+aTYWuJWGpY3Dp0t2vvgovhsWqw9RI7eBLyeTRoCgFm0KgyBxUwIAHbEg+qKeblq/aPXHqxfu+uHrN0IdvuvO+7z956OThoYHlIZtAOTfr/VtSy5sW9rwZF1YxSoGgAI5AgcBou5rlHM+vMqmFMimMwAgisEFIZJQNiMAEb8IgNM5YuWDvobkRzfaDU8rzmoQgEE8MZYbJ+beQeHhSMaQBYKUtD/POWnkZpwFZMkxkiUMEDhwYY4hJvY/TRnP6ju3XvX/L9WUECbKm1Pce3Z/6ZFlv/3DXYATuRvHu2z6059j+mYO7Y/9mbTFPMJ1jRjyfL5FAfVv7atuKpKQgSbNmaI0JKCwWPLTlsiKVtg9cedUAHNgjdwLknoB2szwD45AFUI+ksr38mQ987Hf/8o++/vB3fECOofzeFqC+x1JFoawz9dplmzZ94+++ev22q0lbT9/7pZe/f8/t6wepORX78pLVV3zgs7+OoY0AJfVWVKreesOdAKAOEmPi+IF7/vrEM5OxtIrGEZwqnIGSBzypNzBLK6XU1IergJ985aG/61+x7GMfuOE//uFf3fmhn9owvI6YDGTOwj8ro9+GbGn3AyUFKUJwiGB+vdfcZbnwYeG8/5bCGVILtdC8wZWHshArM9jAsDApk2pbfM3HbF0ywCDK49wMFnCukOTvE2nuWVLNG5MwnfXgMRRQFoiDtGMmZAzIgCgDKQyMeKctd8Wqdb2oBuAM5oFnH7zviYdnalPDvYMfv+Wuj2+7I4Auo/6r11/x0tHXU5/kLjtuS468DSrnESdua63C59S7MwkAP5fRLAR4n7osMsYXTQOuwxYFJoYjsIP3gM9t9bw/C0BQD0+AQDVVE8qG3lX/7Ff/hyeefupkOik4G0iZl+HKl7C66dKRSi6PiSDKxHlERQhEtliunBo5s2rlilUD1UPPPvT4d7507eVLO01aKFVOTJkrrrkK3UtgwgO7Xx+dmFm3dgOYxsZH6lOj1jWXV32MuLq0002dzsibfF8E8AwjYIGKerSMJH3lgrV274FnH7/3r+/63G9cd82Vx48fX71ygyVr8+rE3N25gER+k1UoOJubrEqqykxKeR/RvPDL5B5igQcJiaoCogER1GDuI+oNnEUaaBqIIy0IWGABCzArs1gWJWZL56zFrC2MfL09IY8ZWApUUqvWghiqqmwNvGO2Jnc9ecniTB2MIm622HDeYS4ldbAepCAGDAyLJXgIbdtw+db1my1U4F46vfsP//bPxqS+bNnQ0wdeGhudHO5Ztnbl6hC0efmqgpBmaamznMVJJ5cLhWIjiSnCaH1ETUBC7DUABzABi1VnGOxhKIA69STitN2FlW1HZ5qmZOnL93/z0WeeLom1jhiUT3iWSogAACAASURBVLhXIWLO1Wf1ykpEkY2McIELN2259qduvqsAWtW9/O6PfPz3v/yn/etXnJkYZWajBPZERDA5o/mJ7Fl8ttIDmNVKhRAF0euv77ti/YpK2f/+n/3OUCVdubQb41Pjk82u3jVf+MIf2x17qH/Dje//2MpVq8uVjhMnTzzx+FOFwDXGDh8Ja9nxFwbN+OqBTmpmViUgTUmJmYSNMIkxAqOOOUXQuHx5//0PfX3dtutvu+ETX/vuDiJqxmlYjlSgcMwm74+ICxHMQj6UPOV5rtE0gWa99UyKXCyAQKpMbZGSb3GBgEThgbyhyVwaNAPIRYoRDrw1ZMWfM558kLm/TplYSQn5RlTPNs/fgWjm6uNTxe4OiZ1PAXCpWIkbSYFC601ntbOz2EFgBoFJDLEJCcSwQqx5aFW5r6evN+oJYAj80u6XMiO9ywaacGlozjSmjp45vXnl5iaSFUOrQhNyila9EQiu377tF3/6HzQ1eXHf7j//+l+pd46I2QrYwYsXJrUCq5ZESRkCUYPZlq2sCE0ozh84fmTPq6+wY9MOUbYD7kSUf1DVe3hVIU8QU0DhiUefvH7rdYOVLkCHh5ZLks6MT6p4UXgPL/Ayv8HxpcF7oIBRm0i85s5ivLxnd6lQqAR0cNdjNjm9driofgKBG1rTP1WrD/bixTeemjp4uKOnr3dw/fNjz87MzFiW/q7S/gPHTs28fmW/H4w4ro9XQmNUmQkqAlITkFjAGoFBSiRF6zr7i8uO00uPPbT6yts3rFr5xJNPbL/2plqSFUK2ZFQV8vayXc6xQ3J1CfDwswLBGk8KwyoKT5KTSq5/sFfxZB3UQrXtzDnbVcgoAs+BZ+/VEIs/R9OenwDLQiqak0rRs/MwAgYcdEm1c0lQ9TE6wkoxKikMwF3FLjl6xMWNQEKOfQAAnLTiLE4acTOBJvCNJK4nsYRETKMzMxOuNmi7IpjOqFoNSg1BM01L1XJVO6o93QKTAZ7YgQQcGkaSrF6ydAAloo6Jrj6Ns7BcpIJQGAjUwWdeXOYFwpzveIInKAVkMOtdDGzofCqZLxWqoRJEzzYf9KIqEDIwIiIkjUbTGBOwYQRjk1O1ZqOrXAnIFMsVdXCthC2ZtvBou1p0ti97e1++O1x6UsnpRNE+HMBDnn125603XzvQWfj3f/Kfb960fHk0EyTjWqTYNTLXGupfWli2MulYl1G8ev1woaPikjRNGvXT+1YMFLuW9HakR1hrpWpIvgX1XpWJWHM7UVUkT3ZVlsAkzekTW9YO3L/jgbt+5nOb1l317Cuv3XP/PT/9iY8GFBH0XXcYbPeKJlCQoZSY1AWp5zxsTGxYYaTtXjbCYYZQAuQbm0TaDZoEJAQOHZdT7kg4ErLWyrl1iTLPRjWzG4i9VthmsS04DsEEWrtk5ZV9q/cdOrB6bf9w5yBDyih8+Lpbp06eTL3ffsW2jStWh7AzmDEFY4uBLQYCErCx1rABE1s6NTpyYuzMZUtXWYQfv+UjO15+9vnje8tR0BN1bhm+fOPajXW0MvCRM2cyrxzY3p7esamjyVStByUFVYRDMZo5l2WZOA8KEHUVu3rDnoJmM/VpCAEGJCQ2jxgir7tkNlRKfMKKgAxBoVARL2Kt9d7HWWxAKtb5rJPLrGzIWLJdlY5l/YNePJHM1GtgKhRKjbT57ltIvgUuNakQCERA6lIhGBM6l9z6vptsVhs7sGfA+iXGUzptEFMAqHR1csxx0TTHp05uue7DfYP9HT19UbmMtIF09Xf/3x8EqEVhHCJTdWDnFartDUdwUCV4ImImY4yxOjUz3t1RWdkb7HriW9d9cnDNuqUPP71rulkrhREpk1deIHYxH6qaK82impuqArgkCxWhDQKYCHap7drUMTyWTEWdZacJ5Vq/qBEQ4KBxs1WtlNZ0raiilCFVJgBBIfCpVxGGDpW7/6dP/3LLZs4qgCRJ5k2j5DGWdmwn97OpwkuBgnQm3rB8dRmBwnzgsmuv23iFGDIUBRwZYQP61FV3ffSqmyYbU53lrgBRDHeidWb/6WOohi1yMVyCjMQFBEMcFgunTo6+dvjgjUuvsWh1o/pv/8lvfuuR+w4cOrjl8q03XX1TB0oO1ETyrQe+05SMAzMxPUmS2yTCMFFKkZATthSwMIEM7EDQ9Wsf/8UEAkie+ZY/F5/thgAAROSdM8Q8e9TPXJM7mcuAm3UZs7L3noS2b70qAjuIg54YGzHFSEyuCAuB25nXZzMocEliLO+NBwzqnE+y1HNr9xt7Vwx0F7P4sW/fs35FX4lHI85CiOYOUPGGs4iyKJDBpUtg4RMPBiwwU+/uqhTrWlQK4cW7PHqe+6IAzFoWnnN/EhGxdvcUnUm3Xj706DMPve+zn9u4YcWxsamOctGJC5TNO7LuVJUMRVGUTdXq9XqetHz3+z76kfd9OIHLkAmyDE4AhhqwBUv7cDxThM00UzL1ZiPJ4o4wjCluH9iicvmytWmuVwNy7rE7eSuJdrIM8hNLSCABAoGGCBViwKXAVlASwIEyGGUTIrTIWk77y32j8VSxEE6gtfvEgZONcQmomSUtxB4alqKyKbQinWnWVq5Z8eCOx69cecWNQ9tC2G7q+Id3fJogDMuIYpCAdh155bFdO7EkYmsZTg0F4ACWwRHbiE2WekkznzmFGOCK4c0bhy8DiEAGpPACMMSem/FGIA9PUDMb/Z8XfqfZedB5c0KAWpgka5WDjl1ndj+246mgVCiUombSZGPgiYiCwP7kZhbP9zOwolQolAvFBGKYJibHbrhs4GuHXx3oa0ZFFykFsw5NDxPCWISRFv71v/o/0Tm8dOUqiFw2vLJxei/GTly5tBSpCbxxVqmdUDa/O4S2k7DI5yyoXCw0XNZTCERG4GoBR5FRSdOgGObVEm+XVvIyKhHlgEvlcqlSUSBEKJAQGsIQWGAcfIJMAAMYGIHPIBbWgJkEsJXuTluMWs2WeEmdeKhXCWdTYACYecdW5XeeP4ycJ3uYGM6DW6hPTU9Wy6VuW6kiUNAk4oOjR06OjA4PLV/dPQgbTiOtF+wbOPnIrice2fnQ6PhotVgMi2GAMEXDRCZupVPTkz2Dg2emJ8I4/Pwj9/Z+duUQyn0Iy9AKQsAkUIJpIfnC17/iI6ontUqpbGDFGjIMEMBsOGRbVCiFRbYhmNvGFHI6MaDZNElinHNWALUvU52XKDP7yJQzCJptYDx3vUBtUHjl9N7//Ae/99Kel8sDHZlzIs5nog7iNU0zvpBIeTd4T6QKEbkkCaLIggs2OnFkf6MPBZNEYctGCdRBxBDlwpJAIUU7Ht9x9HThrk/fmTFvWL++aoMn7/tS4/iTW/7B9ZY4IBbPqo6lnTqj1D4PJNeR2mDy0jQF1JMzA0tLLzz1yKZbP9tRKO984um7bv/gD1Vkzz2wqg2nuenFjtRE9uTM6BMHni1noUtVnbMeLF7VO/JJqJXuav74xNqKYxMUa7VGd6VjMp3Zf/pE5sVP1TuoQooEkrI8/vLjXjKys1EAzjM4AIDMm1NiRdWJpC6LOiqHjh+9/8EHVi5bvmnt2jWDy6cmpw6Pn95z6OCpM6NrVq2+adtVpXIh8emxqTNP7nlh/5mjtoDMt4w1z+170ZKdqdcPjB+Rgpiw5BmIzFS9/thrO5O/zD5+1S03DG9cbqJKtR8QUZ2h+BtPfG/fyQPl/g6muJk1QybxWculMdIQgYsdxVqMQlZX4ojBCbK9xw/tP3JIRFhBpB55RzUJzu2vw0TO+5wfzR1io9L+RwqW/OSW9uqIiKqLSqVTp45/9/sPvvLGK2G1kPg0nUlCy4GNYMl7VyiGl7xf3CUjlXO5tURR2Igbp86MIPMfvf2Ooy98e6A7LJYcBTGTI1Kv7Y2ueQNTgxWrlp84ceKjd99NRA/fe1/nkp5sMjo6crRvHUhEkjQwhlWISJXy7QuARUU9KzyUDHlyaptBGKztXrV//yubbnTXbLmmVU/VIwgMAMySlqrCnJ1NydtGKRGQhwiF2BMLG0+kQFMyR/TUgZd27dkdiTEIIm+LKf7RZ//hQE//7gOvffHbX6OOSEmcOu+9qiqxVwI4KJbGatNB1HHb1us39q9c3bk8RnzProe+eM9XwO30DdW8okrzHFNt9zl7M1RVALJMJTo9sWfn6Mskysye4ZV8RUdHXtx5/y5Vz9aShQ8QdQawZArUcnLvsw99d+cjCiRFSVmVuVZrsLKtBlzhPad2nzm8/37T8dGtN/z3n/hsnDQKUefBmaOfv+9Lvkot13LGZUkSlYpqzFTWSCAB/Nqh4VW9K1545aXBaveNV15lQQ00H3jmwb/4my9We7o9FEx+tvkgKyAisxTBiizL4IUNq6j6/ISWttFCoqESOYGyJw/AuVTEiTpRL3BaoYRiFmNM3qPcQYx3TrzPI3DmrLr+bvGeSBURSdPUEq9cPrRqeBUlpybHjpeLUiiJLTiC6rwDokgJgOPsA7ffPrTxxmpXz86dz1y1/doOXvdo4/lKd1kKDedFocrw6omIyfBsaImgVk1uLypYWZxxBi7k7NiR1wuFMtnKG3teevKxp4aHh6/asjUwFIQhAFr40CBqH8ozG4XMH8pLRoARV/AtNQY+yKjCZsWmdZ0oDgQ180JpyjVTjT1UjMvj8l6JjHWSmo7It2Tr1q23r7ohQXNUpl8d2T8dJcoq8G2qMKqiksuptxgekXjxkjFzUAqY2Uk6vxMcEWG2OEAk8yKatftO5NcoibTTQHJ9RpSywBoRbmXx0fGZzddtmUajEIUH0xNfuP+rtULaMiomLxGBV6XIjk7PtJAtQXdP0f6r//l/3/fGgb5yx6qVKxUyozN7Trxu+sM6t/KELj+bSEt5ieosSOE5Uy+GmQDxwgovwgpVgahrlxmziiq8QwoSNgQQIQB5AucHDJ5/cPGlxXulgBUKBQAQ9VlsQpqeOlUoIixqWNB8aZiMEJMYkGXQNTdv/8Bdt0UD23a/+OoTjz/92c988rJ1A5TcXqX9iNKkKYgMzFyPMJ1XgaVz+1nIUx5gM8xexSVQd+ro8e/de9/gsmWvTE0sH1o6vHIY7S7xcoFMXtK8WojgGI4gc8dZkQorAyQsGflMWZjI8NPHnl2xdGj3qX2nW6OJEc+iLMSAshILIbdbAvKxT6ioCeI6kt2nXnl4x4NSsmLbhUrI08dEQeKh8wOSb3LaqKoJYJlVtZk24B1bS2zmikPaipyqF/GazqV7szm73Nq+KZOwErMxqhoUgukzU7/6058aWjqYwE0j/budD9z/whO+I3ShOngvHgGlIoUwOjxy8vEXn//5bR+tolqOqsuvWFZEKNCTGL3/6UdePfYqVaUVN5RJZ1M38mfRXNcSzZNxvMmgonk8Sj0rRNt1xXlDxDx3on3qkBFAmNiyASBq/Gz9Yx7bnUucaft8oPw2qx0XwnuVAybOifMWyt4ha1UroXNOA4fIsygpG1jVUG1AWlEqiQ32HTi8pXvziy+/dPDg4ad2PnvmRNHNTGy/Yjj2viUzxcCzdUYNyJPonPHnVIiVtO0xyVeFGRGju1qCSLVY7O3uMor+gX4R8S4zxuKHzJ0AQgorYGFi4Xbx0KyNSRB2mRpi/dJ3vqZOOKCYvTfq2osG0NkwfxgEaZx2dZfvf/zBFyrPnDh2/PCpo1Fnqe7j/PBVnc1vaNcLKGaLKQHg/DJJJ6qSEZEJmShSVYj4WS/rOS3GVUEGQJ6mNfeAeTBV234FYiJ4jePW6g1rbrntzhYog9t1au+ffetvKsv7x5KaqpAhiEDhvTdBNDI9ec/D37lt680D1K3wAgUoht91dM+X7vnKRHOy1FPSzDOR6FnWRiAlVVVwu5wSlCnDMEjb7i+Bz7sIsKoBKQs0j9IZJohAMpfmrXnavYzmsk45J6l3f3Da+biUHrD5DSOzzFkvpIzEo2LKxeJUHV2D3a4xXfCgDC5R5aBYWZq5TmuHdjzz9EuHf7Dj5ZFrrr7+3/72b2et5j1f//zLzz9a/8T1m9f1dRWi7n47dWpvd3dQnzwNjaOCyS3FqH1+Z94KBNZy0tKoENQakrVa8L5A2HrZZZO1eiEIe7t7jA2AC9XV5NYKEBrjWQCoB3MYAArbTgTMGdvspx1UoaOtaVZ2LY8gsIHNSSlPnRSAyDjN1FO5EEnm9x7dv8/BJaktRM00duTU8dxB7sT5qauUp3bNjez8sao6KCsRzKyXVZhEDLGo8JtOD57zN6azFQNElkkB1z5TgUXECJPHyNjor/+732BPADJV31EYq08KSe5PYXhxHlA1XozuOvLar//fv3nj1ddetm59R0fHgUOHdzz/3J6j+yZcIygVkjiLKFRVzS23eUm0bvYgVVXAwRAxiJELABgYy8Z7Z5msV1YWVcAYtk48OFBm5TzFKxfJ7Rq+uBmH1naUKpaNzQuIZ+dORH6Czlc5mzXOtlAgxNmZg0eee/LJYjjVu9R64pk4iQxCG5WLFaArbVbGalHNL3ns+dfWbrwexVWPPrVzYmJmxYoVLzz7zNDAULVn7f6TcujY0SXVrITR67es6O2rFrqKBk1wLBKzegaBhEhAjkg5sAV2YoNWM1m6ZBCT08aHq1csv7JnibCtVqvifa6fYIEp09mk49p4nRtiM6g5p1w7Lzs7p44CQk7ZGmNg8/XQdgEtEYySioRWyYHUI1OjJmATqbcwRDQrQPJjQPIPvkVyfj5Io6LExJwfV6okBMn9SOf3Nefz/min/fr2IV7KioBAogaO1YKhSgFzAA40L/IUkHg1XgDlCsIMIordr+/e/erLxmkQBAgMh4EYNYatEMRY5uZ0LVetkIsLIp8nk876uNR5Ru549uTmju32BkjqDQUZaa+IEnmnAAsYHCCvLWuH/wWAiEMBkzMz9cFpamsYeiFW807wHtWriEtTq8jipLNQ8lJbs3bj4eMPNISKnV2i2tIq++XaseLFlw499MQzg6uvue32u1av33r1tbc/tXPHo4/+wKVp75KeF1479E//+b94+HvfkdDv3vfsTLOR0MDlG7bE8fE0GRNOiwUlzsApa944x1kbFECplKamWsMr1jz75FPPvzz2iZ/9ud6lQzAMhapX1fNtep7NHFKQClk221ZvmqnXEiPetI+op1nBAoiS5MneyqSq5CkwhkFKefcjhuYdMEjEqfooCBmi6oiseA3CMJNMdTaRPU/gpzZb/aGHT+Q2LrWTb5kkLyxs51AtTCqzHz/buVxmO0uokngRJiOiABu0ZZMAHl4oAwAR71TAxWLZmyTqLmjsfJz6OCUiBMYWIwqNc4lm3grYi6lAM0+iRCQknuE1b7DSZhHiPIMMDCs75xnIsqz9ID25l0wA5CWO3gkh9ACYSZgheb/MtnAxEKNpnK1ZOWzn8cJ3EE87H+8RqZCNIrTSnt6uaOP6vv7LsSyp1TVFFHRWW7VWfSqcHqdvfuM7995/uthR+NDqzrGJ+PP/7rfXXXb5C8+/uPOZnc75E6dOTtWSvqXr1my47uc/8ymktb/56z/cuXdPTej4kRGm+uDy6qrhJcWiB2KwM5oaimGYCiytYtJqvv/Om44eLt5x68ZiZJHF4BK8b+dK5lvy3C3FCiGGKHutWP6FWz70Sx/+KZBrmy4Qq5I7x/Jo6Gz/BcpPDY3IMKzJo3JzEwFycBAJmEk1dYkQG5jQhqoCOVtD2e4AJG1vqSHChc57yKHwKqpMbIzJFTaBqnKeQsJ5ydcPUdnPdr6DB6BMHl68EBkiMjCmnfYqIBFkIIEncQoyYVjItapATcB5mQOcIBHnyKuqVYrYWIC9wDDEAwYEmNwDmrtABQo4D6J2FnUuVbxH7oEg025RlJcOMCFzszU8+db1bcOMABZEZqI+We3pMSiqKFRUjdAF1vod4D2IqxCglLWSgFDq7jy6Z8/37n3wF375zp7yMktTMKXEuJ27j546Hv3rP7i/8h9//9DxMyhWr7jmmhf2vvblL395ZGRs+fLloyPj45PTK1YM//5/+cM0dUJsmb758K6brr/q8998+uot133m0x/+3d/7N/s//8Qn777ujjtuqdXHs2zcNY51VNFdLnUsWb5374N33YZdT+6g0uAtK1bCAOKUeWFVNXdawWeuZAoUJ5OPv3xq/77l/d0ubthAJGux9zbnYWAhJjKsYpmtEjnxxhphEoHkhVzeS5uuSEHiSME2tCYQ5SCMkHpWzlfacaZISVMDBQmzsWQxG1qZv+Nz4vLwUDE2ZP7/qHvzKLuu6kz82/ucO7z5VdWrQSrNsyVZky3b8jxjwBMYgwkQMzUNGX/prCSku9Od9JAEAknIr0NCCKSbBAIYMGDjgDGe8CBPsmTJGktjqebpVb353nPO7j/uK1k2Ng3EXqt7r7tK6y29WnXve/fcvc/e36AVEtpYAlcQgKHYEjM5EtBrJCgHm7SQAKgkTSnxE+QDJSQwYqUAWBgAgBERJZBYGo0oSGdIaUewxsbGxU4UyApZQSxOKbaMFpF1TpFVEpFYIgVhcSoZXClui6YaExGTUhoiRmIRaXNIoVyiOsacLH4CiUk2aWjz2wRwDkJOkbCLVBSGdLLV8BavWHrldUhro0iIFTBvDvCLy72/3pJ58+fghSGcQbPJnlq/fuOJgZH+njXDpx/QAZd6V2YLfut0+m//9ts3ve2D933//mJXR2epL5Mr/MVnPrPr2V1a69HxyT/900+8732/LI4eevjhJ3c+fcUVV/zRn/xlPp1N55decP4WL9997Y3/n3rke8++OL7v+M5Nm9fOTJf3PvviFZcU337T9VOj0cZ1F0c1vnDbBX3rtqOvDyIgJ+KIvNe+BAKJdU6TIJad37r3B1/+x+WlDleb87QLlPgiCY/PgQWamJSDT8oXgXG+UsqBrZC0Na/akneJcImzcI61r6CU45SXosiyJKRFZ1UEMgotRe2STLWZSaBXZAZhIYhYJ84prVhrIRGxiahf+y8qR0ikVV4jsbTryTOaZU5ckgtZEjtugJM9j5sfolsSeM4x0GhEYTolWkPYWmuMISdEygo556KkflWKWZgcYJgiOKeg2WlyPpDc60lJBmsjIiaWZE9kyYgjBilo54SgwDo5JS0kZh6Y3N4Tghw5YgsjZCjFyHhTng7PO3/phVcihDujSCj0Ex/lzxdvTAFGEjcbNorDTHrNuvUPfv/I/iOH3vWeS5/72jc3bd04PlwLvM7f/8P/CtcH0Z/45F/3L16UynRtWL9548ZN2Wzuvvv+pVye7u3t6ekplUqlpcsW/+iBhy69+KIwDEfGR9975/uD0Dt14viGrVedHm/mO3L////4y9Ki3vVr142OjHipAum++x/49rvf8Ucv/Pj0iaNTF4V9Pbk8cjnQa7sOJ30tFgBBKoxqDV/rYirdFaR6dcA6CIkCMJEDIWa2xAJmIg/wiX0hYucxETsmy3BEfoKoJQETawiZmACGJmEnJk0MTkYzICKnfEVKsdZMFsZZx5bUPH3/bJO9hEMookSErGLhhKMVEQnBEWkHXwQCA7zWyD/hM5NAMaHNP4MjGHGO273p+VFmwpxhFs1WPLiUpxsWoe8n0BsXk2s/qpWIOAsjwgxmcUosW6chpOEktJ6ymhGKS/pRYiRpPSsiloStRw7wwI5ZswCKHcGxAmsSeBDHlMh1ELVxSgnYgZiFdKPZbDTqks/l/SwiJI+018tJ6o2SofBSoTiBc5Zw9U23gGJgeOuma44PTC9cvFrpGJSJI3hKTU6UFyxcBKhVy1fdffe3+voWlEol3/dLpc5HH3lk0+bNS5YsCULv03/+qU2bNm3ffuFjjz++aNGi7lL36dPDpDs6epZ195/74GP7V625xVLvORsunZiQQm6Vqfil0vKVKy/JLF2JIAVScML8mjiweayeA8gPAlRqrdqsZ6LAxMq4kMjGLUcwzE3FMbMjVtDKIQA8EMcmTeI745tYSECkwIrBAs3JUjEEB8QwjoxRnnHGUltYGaxZlBhFRnMTIGfDltMG2oIF87OaM1sLkBMLAhMUg6WpqKLJEFuQB5eNXWChXLIbfvU7RaGNEiI4IhjmluKWSF2zoaSFLBAhIREoEeXgG5syJi3wWpHPpJQCnMTOJYKPxCLkrHXOQbHWOvak6qGlKGJWIM8iiJ1nm2JhrQWgRQBYZ+dFuR0TJWwkrZyIOEUtxY5UDAExOatsS1sol2RdCMGdGbASpZVXbkbVSovrEeJkuz9/wf+6lILXmVsPnMnXBOenfMRWFfKVYycmThytVAfPvfCGz/7DX1xV3GZI4GWjsvWK6pa33/K1r/3z1Mjw0lWrjhw7snXr1ssuvfzZXc+cOnVqZGTkvvvuWdy/6A/+4x888NCD+XzxU5/6pFj7W7/1m2+/5WYRRay/+b1vb79o23f/5b6m0NhUfPhwRebKF2+5VfuLT5zau3HLWnC63dv6qeRHNc+XaEO/NadDP5sJ4lYlVKRYRVBhTxeHqWagC12dLjFLMKjNVSJHK7t71MhY5eiRIMk/nKizJOxhS84FbV6+gwfSrGCY4ZxrM0YJnAnLcMs2r49aVc/IzHP7Suz7zM5aKAGgLat5tq0lBL6vA7/JNFqZbebzCy87v2vNyu5S99E9L5b3HamdGu40pOsNBcPzv3VWcKJu1jZagTiiWAfhokX5NatPzJULxUKlMgtAOSjioWPHuFHPObvQodFqdpW6K9MTnqcgloxVSARvDQkzK7BqmLjQ0THcqjWL+eLaVfVU4LXs2CM7+0Sxs544xYAwiBSRECcGtcnehYTEEZxxBAq8BlvTmfWWLpudq6bjeOTFF3uUFyaPIMdJE/KM86WJXYZ0ALhmBKKkofx6xeucVdw85lfmbzko8tLhv/zgR6VSevMlW9/59l/72re/uWbjdsQ2lfFhow//mw+2THPXnj3XLbhmw4YNn/3sZ2+55ZYX9uzr7i79yq987L/95CXdGwAAIABJREFUt/9+zVVXzZTL3V1dp06dCjx/wZKegYHDzzzz1PYdl9tm9Kbrr/38l764/8C+hx99rLd39UMPPP/ht7+DbReQTedLXr4DKR+awRpytjvNa5x+wq0khkA74zmjnGFACNPVuStuuP7Kj/8OOnMJTaMtdhU5eD6a8egX/uHezx4lR0qEE9AImOctih25s2/ZxKuwLcEqROwZpYMFXWv//e+uLWYwPDryV18Y27lLIoE4YcXiFDk2opksnGOwR7PN2hSct2rZdR94H664AEv6MVtZc821OD784z/59Pj+oz1aKWPUqyyV+d538n0RO5GWVpe855dwww3nBj7EQivIfJOqVoMz2PfCiQceHHzyyYmh08ty+ag6GzATaSRVomMmbSEAKw6NcLkRb77k8sJ73oX+xRidOPLjO0qOLcfqZZAt1RZRncfdESDOCTPDlSv12azadvllHR/4AJTCM8/hc5/H0BBHFuIcv6Jloc503knaLa82DOIsXZFfOF7HpXKWuky7IeZADorC7s7b3vu+3lIepdzE3gMbVmweOHji3q//843vutNF5oEHH1q6fPnhI4d3XLZjwaIlF1x08Ve++vVSqYuU99CDj9zxrndfedXlH//d3xs6PTJ48lQ2HQ4Nnt675/ny9OyLe1+87MorqvX64w8+uKK//8TBAd1XuGzbVYWgd9/uIyPjey688s1+qYh8Di5C0gWhV53TJ+eaeHCf0cNxnnO+ddrFBILyHCubCtDXhawH7UEUrMAKLKHWQipwqVB8zWK1c5wgOajdAbPkRDsjjua/SA/kBETCyThAZKZSG08r9JTQmYaJq5ob1maVJ7GGODhHAp9IE1rOCcF6aqZlqh25i+64FW+9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',
              width: 100,
            },
          ],
        },
        {
          text: 'Credit Note',
          margin: [0, 0, 0, 0],
          fontSize: 23,
          style: 'green',
        },
        {
          text: `${credit_note_number}`,
          margin: [0, 0, 0, 0],
          style: 'subheader',
          bold: true,
        },
        // {
        //   text: 'Credit Remaining',
        //   margin: [0, 15, 0, 0],
        //   fontSize: 15,
        //   style: 'green'
        // },
        // {
        //   text: `AED {balance_due}`,
        //   margin: [0, 0, 0, 0],
        //   fontSize: 15,
        //   bold: true,
        // },
        {
          margin: [0, 15, 0, 0],
          layout: 'noBorders',
          table: {
            widths: ['*', 'auto', '300'],
            body: [
              [
                {
                  text: 'BILL TO',
                  fontSize: 10,
                  bold: true,
                },
                {
                  text: 'Credit Note Date:',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${moment(createdAt).format('DD-MM-YYYY')}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
              [
                {
                  rowSpan: 3,
                  margin: [0, 5, 0, 0],
                  fontSize: 9,
                  stack: [
                    // second column consists of paragraphs
                    {
                      text: `${customer_name}`,
                    },
                    {
                      text: `${customer_address}`,
                    },
                    {
                      text: `TRN-87678`,
                    },
                  ],
                },
                {
                  text: 'DATE',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${moment(invoice_date).format('DD-MM-YYYY')}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
              [
                '',
                {
                  text: 'DUE DATE',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${moment(due_date).format('DD-MM-YYYY')}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
              [
                '',
                {
                  text: 'PAYMENT TERMS',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${terms_name}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
            ],
          },
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 15,
              x2: 515,
              y2: 15,
              lineWidth: 3,
              color: '#25baa2',
            },
          ],
        },
        {
          margin: [0, 40, 0, 0],
          layout: 'noBorders',
          table: {
            widths: ['*', 50, 50, 50, 50],
            body: [
              [
                {
                  text: 'PRODUCT/SERVICE',
                  fontSize: 10,
                  bold: true,
                  fillColor: '#C6DEEF',
                  style: 'green',
                },
                {
                  text: 'QTY',
                  style: 'green',
                  fontSize: 10,
                  bold: true,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'RATE',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'TAX AMOUNT',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'TOTAL AMOUNT',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                  alignment: 'right',
                  margin: [0, 0, 10, 0],
                },
              ],
              ...activities,
            ],
          },
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 15,
              x2: 515,
              y2: 15,
              lineWidth: 1,
              dash: {
                length: 2,
              },
              lineColor: 'gray',
            },
          ],
        },
        {
          margin: [0, 10, 0, 0],
          layout: 'noBorders',
          table: {
            widths: ['*', 100, 150],
            body: [
              [
                {
                  text: '',
                  fontSize: 10,
                },
                {
                  stack: [
                    // second column consists of paragraphs
                    {
                      text: 'SUB TOTAL',
                      fontSize: 9,
                    },
                    {
                      text: 'VAT TOTAL',
                      fontSize: 9,
                    },
                    {
                      text: 'TOTAL',
                      style: 'subHeader',
                    },
                    // {
                    //     text: 'PARTIAL PAYMENT',
                    //     style: 'subHeader'
                    // },
                    // {
                    //     text: 'BALANCE DUE',
                    //     style: 'subHeader'
                    // }
                  ],
                  fontSize: 9,
                },
                {
                  stack: [
                    // second column consists of paragraphs
                    {
                      text: `${sub_total}`,
                      fontSize: 9,
                    },
                    {
                      text: `${vat_total}`,
                      fontSize: 9,
                    },
                    {
                      text: `${total}`,
                      fontSize: 9,
                    },
                    // {
                    //     text: partialAmount,
                    //     style: 'subHeader'
                    // },
                    // {
                    //     text: `AED {balance_due}`,
                    //     fontSize: 20,
                    //     bold: true,
                    //     style: 'subHeader',
                    // }
                  ],
                  fontSize: 9,
                  alignment: 'right',
                  margin: [0, 0, 10, 0],
                },
              ],
            ],
          },
        },
      ],
      footer: {
        margin: [20, 0, 0, 0],
        stack: [
          {
            text: 'Terms and Conditions',
            style: 'small',
            bold: true,
            margin: [0, 0, 0, 10],
          },
          {
            text: `The following terminology applies to these Terms and Conditions. Privacy Statement and Disclaimer Notice and all Agreements:`,
            style: 'small',
          },
          {
            text: `'Client', 'You and 'Your' refers to you, the person log on this website and complaint to the Company's terms and conditions.`,
            style: 'small',
          },
          {
            text: `The Company". "Ourselves". "We". "Our" and "Us"`,
            style: 'small',
            margin: [0, 0, 0, 10],
          },
          {
            text: 'Kindly pay the above amount by: Cheque or Bank Transfer (Please provide proof of payment)',
            style: 'small',
            bold: true,
            margin: [0, 0, 0, 10],
          },
          {
            text: 'Name of Beneficiary: Eat and Drink Restaurant',
            style: 'small',
          },
          {
            text: 'Bank Name: Emirates Islamic Bank PJSC',
            style: 'small',
          },
          {
            text: 'A/C No: 5708239930  (AED Account)',
            style: 'small',
          },
          {
            text: 'IBAN number (or swift code/BIC code): AE990340003708239930',
            style: 'small',
          },
          {
            text: 'Swift Code: MEBLAEAD',
            style: 'small',
            margin: [0, 0, 0, 10],
          },
          {
            text: 'This is a system generated invoice and does not require signature.',
            style: 'small',
            margin: [0, 0, 0, 5],
          },
        ],
      },
      styles: {
        header: {
          fontSize: 9,
        },
        subheader: {
          fontSize: 9,
        },
        small: {
          fontSize: 8,
        },
        superMargin: {
          margin: [20, 0, 40, 0],
          fontSize: 15,
        },
        green: {
          color: '#3480B9',
        },
      },
    };

    const s3 = new AWS.S3({
      accessKeyId: process.env.SECRET_ID_AWS,
      secretAccessKey: process.env.SECRET_KEY_AWS,
    });

    const file = await generateInvoiceFile(dd, fileName);
    let fileStream = fs.readFileSync(fileName);
    const params = {
      Bucket: process.env.BUCKET_NAME + '/creditnote',
      Key: fileName,
      Body: fileStream,
      ACL: 'public-read',
      ContentType: 'application/pdf',
    };
    try {
      const result = await s3.upload(params).promise();
      const creditNote = await invoiceService.updateCreditNoteId(credit_note._id, {
        credit_note_link: [
          {
            status: 1,
            path: result.Location,
          },
        ],
      });
      fs.rmSync(`./${fileName}`, {
        force: true,
      });
      resolve({
        success: true,
        creditNote: creditNote,
      });
    } catch (err) {
      throw new ApiError(httpStatus.NOT_FOUND, err);
    }
  });
};

const createDebitNote = catchAsync(async (req, res) => {
  let result;
  let updatedInvoice;
  let newDebitID;
  const lastCreditNote = await invoiceService.getLastDebitNote();
  if (!lastCreditNote) {
    newDebitID = 'DN-1000';
  } else {
    newDebitID = 'DN-' + (parseInt(lastCreditNote.debit_note_number.split('-')[1]) + 1);
  }
  const { body } = req;
  result = await invoiceService.createDebitNote({
    ...body,
    debit_note_number: newDebitID,
    balance_due: body.total,
  });
  const invoiceId = ObjectId(body.invoice);
  const invoice = await invoiceService.getInvoiceById(invoiceId);
  if (invoice) {
    let debitData = invoice.debit_notes ? invoice.debit_notes : [];
    var payload = {
      debit_applied: true,
      debit_notes: debitData.concat(result.debitNote._id),
    };
    updatedInvoice = await invoiceService.updateInvoiceById(invoiceId, payload);
    await logInvoiceActivity(updatedInvoice._id, req.user._id, 'invoice', updatedInvoice, 'user updated invoice', payload);
  }
  const updatedData = await uploadDebitNoteFileToS3(updatedInvoice, result.debitNote);
  await logActivity(req.user._id, 'debit note', updatedData.debitNote, 'user recorded debit note', updatedData.debitNote);
  res.status(httpStatus.OK).send({
    data: updatedData,
  });
});

const uploadDebitNoteFileToS3 = async (invoice, debit_note) => {
  return new Promise(async (resolve, reject) => {
    const { invoice_number, invoice_date, terms_condition, customer_name, customer_address, customer_trn } = invoice;
    const { debit_note_number, balance_due, items, sub_total, total, debit_note_date, terms_name, due_date, vat_total } =
      debit_note;
    total = twoDecimalsAndPositive(total);
    balance_due = twoDecimalsAndPositive(balance_due);
    sub_total = twoDecimalsAndPositive(sub_total);
    vat_total = twoDecimalsAndPositive(vat_total);
    const uniqueHex = crypto.randomBytes(5).toString('hex');
    const fileName = `DB-${uniqueHex}-${debit_note_number}.pdf`;
    const activities = [];
    items.forEach((item) => {
      activities.push([
        {
          stack: [
            // second column consists of paragraphs
            {
              text: item.service_name,
              fontSize: 9,
              bold: true,
            },
            {
              text: item.description,
              style: 'subHeader',
            },
          ],
          fontSize: 9,
        },
        {
          text: item.quantity,
          style: 'subheader',
        },
        {
          text: item.rate,
          style: 'subheader',
        },
        {
          text: item.tax,
          style: 'subheader',
          alignment: 'right',
          margin: [0, 0, 10, 0],
        },
        {
          text: item.amount,
          style: 'subheader',
          alignment: 'right',
          margin: [0, 0, 10, 0],
        },
      ]);
    });

    var dd = {
      pageSize: 'A4',
      pageMargins: [40, 50, 40, 150],
      content: [
        {
          columns: [
            {
              stack: [
                {
                  text: 'Eat and Drink Restaurant',
                  margin: [0, 0, 0, 0],
                  bold: true,
                  fontSize: 11,
                },
                {
                  text: 'Levels 41 & 42, Emirates Towers',
                  style: 'header',
                },
                {
                  text: 'Sheikh Zayed Rd - Dubai',
                  style: 'header',
                },
                // {
                //   text: '+97144210105',
                //   style: 'header',
                // },
                {
                  text: 'eatanddrink@gmail.com',
                  style: 'header',
                },
                {
                  text: 'TRN 100317375200003',
                  style: 'header',
                },
              ],
            },
            {
              image:
                'data:image/png;base64,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v3VWcKJu1jZagTiiWAfhokX5NatPzJULxUKlMgtAOSjioWPHuFHPObvQodFqdpW6K9MTnqcgloxVSARvDQkzK7BqmLjQ0THcqjWL+eLaVfVU4LXs2CM7+0Sxs544xYAwiBSRECcGtcnehYTEEZxxBAq8BlvTmfWWLpudq6bjeOTFF3uUFyaPIMdJE/KM86WJXYZ0ALhmBKKkofx6xeucVdw85lfmbzko8tLhv/zgR6VSevMlW9/59l/72re/uWbjdsQ2lfFhow//mw+2THPXnj3XLbhmw4YNn/3sZ2+55ZYX9uzr7i79yq987L/95CXdGwAAIABJREFUt/9+zVVXzZTL3V1dp06dCjx/wZKegYHDzzzz1PYdl9tm9Kbrr/38l764/8C+hx99rLd39UMPPP/ht7+DbReQTedLXr4DKR+awRpytjvNa5x+wq0khkA74zmjnGFACNPVuStuuP7Kj/8OOnMJTaMtdhU5eD6a8egX/uHezx4lR0qEE9AImOctih25s2/ZxKuwLcEqROwZpYMFXWv//e+uLWYwPDryV18Y27lLIoE4YcXiFDk2opksnGOwR7PN2hSct2rZdR94H664AEv6MVtZc821OD784z/59Pj+oz1aKWPUqyyV+d538n0RO5GWVpe855dwww3nBj7EQivIfJOqVoMz2PfCiQceHHzyyYmh08ty+ag6GzATaSRVomMmbSEAKw6NcLkRb77k8sJ73oX+xRidOPLjO0qOLcfqZZAt1RZRncfdESDOCTPDlSv12azadvllHR/4AJTCM8/hc5/H0BBHFuIcv6Jloc503knaLa82DOIsXZFfOF7HpXKWuky7IeZADorC7s7b3vu+3lIepdzE3gMbVmweOHji3q//843vutNF5oEHH1q6fPnhI4d3XLZjwaIlF1x08Ve++vVSqYuU99CDj9zxrndfedXlH//d3xs6PTJ48lQ2HQ4Nnt675/ny9OyLe1+87MorqvX64w8+uKK//8TBAd1XuGzbVYWgd9/uIyPjey688s1+qYh8Di5C0gWhV53TJ+eaeHCf0cNxnnO+ddrFBILyHCubCtDXhawH7UEUrMAKLKHWQipwqVB8zWK1c5wgOajdAbPkRDsjjua/SA/kBETCyThAZKZSG08r9JTQmYaJq5ob1maVJ7GGODhHAp9IE1rOCcF6aqZlqh25i+64FW+9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',
              width: 100,
            },
          ],
        },
        {
          text: 'Debit Note',
          margin: [0, 0, 0, 0],
          fontSize: 23,
          style: 'green',
        },
        {
          text: `${debit_note_number}`,
          margin: [0, 0, 0, 0],
          style: 'subheader',
          bold: true,
        },
        {
          text: 'Balance Due',
          margin: [0, 15, 0, 0],
          fontSize: 15,
          style: 'green',
        },
        {
          text: `AED ${balance_due}`,
          margin: [0, 0, 0, 0],
          fontSize: 12,
          bold: true,
        },
        {
          margin: [0, 15, 0, 0],
          layout: 'noBorders',
          table: {
            widths: ['*', 'auto', '300'],
            body: [
              [
                {
                  text: 'BILL TO',
                  fontSize: 10,
                  bold: true,
                },
                {
                  text: 'Debit Note Date:',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${moment(debit_note_date).format('DD-MM-YYYY')}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
              [
                {
                  rowSpan: 3,
                  margin: [0, 5, 0, 0],
                  fontSize: 9,
                  stack: [
                    // second column consists of paragraphs
                    {
                      text: `${customer_name}`,
                    },
                    {
                      text: `${customer_address}`,
                    },
                    {
                      text: `TRN ${customer_trn}`,
                    },
                  ],
                },
                {
                  text: 'DATE',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${moment(invoice_date).format('DD-MM-YYYY')}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
              [
                '',
                {
                  text: 'DUE DATE',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${moment(due_date).format('DD-MM-YYYY')}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
              [
                '',
                {
                  text: 'PAYMENT TERMS',
                  style: 'subheader',
                  bold: true,
                  alignment: 'right',
                },
                {
                  text: `${terms_name}`,
                  style: 'subheader',
                  alignment: 'left',
                },
              ],
            ],
          },
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 15,
              x2: 515,
              y2: 15,
              lineWidth: 3,
              color: '#25baa2',
            },
          ],
        },
        {
          margin: [0, 40, 0, 0],
          layout: 'noBorders',
          table: {
            widths: ['*', 50, 50, 50, 50],
            body: [
              [
                {
                  text: 'PRODUCT/SERVICE',
                  fontSize: 10,
                  bold: true,
                  fillColor: '#C6DEEF',
                  style: 'green',
                },
                {
                  text: 'QTY',
                  style: 'green',
                  fontSize: 10,
                  bold: true,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'RATE',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'TAX AMOUNT',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                },
                {
                  text: 'TOTAL AMOUNT',
                  style: 'green',
                  fontSize: 10,
                  fillColor: '#C6DEEF',
                  alignment: 'right',
                  margin: [0, 0, 10, 0],
                },
              ],
              ...activities,
            ],
          },
        },
        {
          canvas: [
            {
              type: 'line',
              x1: 0,
              y1: 15,
              x2: 515,
              y2: 15,
              lineWidth: 1,
              dash: {
                length: 2,
              },
              lineColor: 'gray',
            },
          ],
        },
        {
          margin: [0, 10, 0, 0],
          layout: 'noBorders',
          table: {
            widths: ['*', 100, 150],
            body: [
              [
                {
                  text: '',
                  fontSize: 10,
                },
                {
                  stack: [
                    // second column consists of paragraphs
                    {
                      text: 'SUB TOTAL',
                      fontSize: 9,
                    },
                    {
                      text: 'VAT TOTAL',
                      fontSize: 9,
                    },
                    {
                      text: 'TOTAL',
                      style: 'subHeader',
                    },
                    // {
                    //     text: 'PARTIAL PAYMENT',
                    //     style: 'subHeader'
                    // },
                    {
                      text: 'BALANCE DUE',
                      style: 'subHeader',
                    },
                  ],
                  fontSize: 9,
                },
                {
                  stack: [
                    // second column consists of paragraphs
                    {
                      text: `${sub_total}`,
                      fontSize: 9,
                    },
                    {
                      text: `${vat_total}`,
                      fontSize: 9,
                    },
                    {
                      text: `${total}`,
                      fontSize: 9,
                    },
                    // {
                    //     text: partialAmount,
                    //     style: 'subHeader'
                    // },
                    {
                      text: `AED ${balance_due}`,
                      fontSize: 12,
                      bold: true,
                      style: 'subHeader',
                    },
                  ],
                  fontSize: 9,
                  alignment: 'right',
                  margin: [0, 0, 10, 0],
                },
              ],
            ],
          },
        },
      ],
      footer: {
        margin: [20, 0, 0, 0],
        stack: [
          {
            text: 'Terms and Conditions',
            style: 'small',
            bold: true,
            margin: [0, 0, 0, 10],
          },
          {
            text: `The following terminology applies to these Terms and Conditions. Privacy Statement and Disclaimer Notice and all Agreements:`,
            style: 'small',
          },
          {
            text: `'Client', 'You and 'Your' refers to you, the person log on this website and complaint to the Company's terms and conditions.`,
            style: 'small',
          },
          {
            text: `The Company". "Ourselves". "We". "Our" and "Us"`,
            style: 'small',
            margin: [0, 0, 0, 10],
          },
          {
            text: 'Kindly pay the above amount by: Cheque or Bank Transfer (Please provide proof of payment)',
            style: 'small',
            bold: true,
            margin: [0, 0, 0, 10],
          },
          {
            text: 'Name of Beneficiary: Eat and Drink Restaurant',
            style: 'small',
          },
          {
            text: 'Bank Name: Emirates Islamic Bank PJSC',
            style: 'small',
          },
          {
            text: 'A/C No: 5708239930  (AED Account)',
            style: 'small',
          },
          {
            text: 'IBAN number (or swift code/BIC code): AE990340003708239930',
            style: 'small',
          },
          {
            text: 'Swift Code: MEBLAEAD',
            style: 'small',
            margin: [0, 0, 0, 10],
          },
          {
            text: 'This is a system generated invoice and does not require signature.',
            style: 'small',
            margin: [0, 0, 0, 5],
          },
        ],
      },
      styles: {
        header: {
          fontSize: 9,
        },
        subheader: {
          fontSize: 9,
        },
        small: {
          fontSize: 8,
        },
        superMargin: {
          margin: [20, 0, 40, 0],
          fontSize: 15,
        },
        green: {
          color: '#3480B9',
        },
      },
    };

    const s3 = new AWS.S3({
      accessKeyId: process.env.SECRET_ID_AWS,
      secretAccessKey: process.env.SECRET_KEY_AWS,
    });

    const file = await generateInvoiceFile(dd, fileName);
    let fileStream = fs.readFileSync(fileName);
    const params = {
      Bucket: process.env.BUCKET_NAME + '/debitnote',
      Key: fileName,
      Body: fileStream,
      ACL: 'public-read',
      ContentType: 'application/pdf',
    };
    try {
      const result = await s3.upload(params).promise();
      const debitNote = await invoiceService.updateDebitNoteId(debit_note._id, {
        debit_note_link: [
          {
            status: 1,
            path: result.Location,
          },
        ],
      });
      fs.rmSync(`./${fileName}`, {
        force: true,
      });
      resolve({
        success: true,
        debitNote: debitNote,
      });
    } catch (err) {
      throw new ApiError(httpStatus.NOT_FOUND, err);
    }
  });
};

const createInvoiceLink = catchAsync(async (req, res) => {
  const { body } = req;
  const s3 = new AWS.S3({
    accessKeyId: process.env.SECRET_ID_AWS,
    secretAccessKey: process.env.SECRET_KEY_AWS,
  });
  const params = {
    Bucket: process.env.BUCKET_NAME + '/invoice',
    Key: body.link,
  };
  let urlLink;

  if (!body.expiry) {
    const data = await s3.getSignedUrlPromise('getObject', params);
    urlLink = data;
  } else {
    const adjustedDate = moment(body.expiry, 'DD-MM-YYYY h:mm').subtract(4, 'hours');
    const adjustedDateString = adjustedDate.format('DD-MM-YYYY h:mm A');
    const convertedDate = moment(`${adjustedDateString}`, 'DD-MM-YYYY h:mm A');
    const currentDate = moment().subtract(4, 'hours');
    const differenceInSeconds = convertedDate.diff(currentDate, 'seconds');
    const updatedParams = {
      ...params,
      Expires: differenceInSeconds,
    };
    const data = await s3.getSignedUrl('getObject', updatedParams);
    urlLink = data;
  }
  const invoiceLink = await invoiceService.createInvoiceLink({
    ...body,
    link: urlLink,
  });
  await logInvoiceActivity(invoiceLink.invoice, req.user._id, 'invoice Link', invoiceLink, 'user sent invoice Link', body);
  res.status(httpStatus.CREATED).send({
    data: {
      invoiceLink,
    },
  });
});

const sendEmail = catchAsync(async (req, res) => {
  const { body } = req;
  const { from, send_to, cc, Subject, emailTemplate } = body;
  const invoice = await invoiceService.getInvoiceById(ObjectId(req.query.invoice));
  const { invoice_path } = invoice;
  const link = invoice_path.find((item) => item.status == 1);
  await emailService.sentInvoiceEmail(from, send_to, cc, Subject, emailTemplate, link.path);
  await logInvoiceActivity(req.query.invoice, req.user._id, 'invoice', body, 'invoice email sent', body);
  res.status(httpStatus.CREATED).send({
    data: {},
  });
});

const cancelInvoice = catchAsync(async (req, res) => {
  const invoice = await invoiceService.cancelInvoice(req.query.id);
  await logInvoiceActivity(req.query.id, req.user._id, 'invoice', invoice, 'user cancelled invoice', req.query);
  res.status(httpStatus.CREATED).send({
    data: {
      invoice,
    },
  });
});

const getAccountInfo = catchAsync(async (req, res) => {
  const invoice = await invoiceService.getAccountInfo(req.params.id);
  let accountArray = [];

  await Promise.all(
    invoice.items.map(async (item) => {
      let account = await getInfoByAccount(item.service);
      const isDuplicate = accountArray.some((existingAccount) => {
        const { credit, debit } = existingAccount.accounts;
        return credit._id === account._id || debit._id === account._id;
      });

      if (!isDuplicate) {
        accountArray.push({
          ...account,
          amount: item.amount,
        });
      }
    })
  );

  const writeOffOutput = accountArray.reduce((acc, obj) => {
    const creditAccount = obj.accounts.credit._id;
    const debitAccount = obj.accounts.debit._id;
    const creditIndex = acc.findIndex((item) => item.account === creditAccount);
    const debitIndex = acc.findIndex((item) => item.account === debitAccount);

    if (creditIndex !== -1) {
      acc[creditIndex].amount += obj.amount;
      acc[creditIndex].isCredit = true;
    } else {
      acc.push({
        account: creditAccount,
        amount: obj.amount,
        isCredit: true,
        isDebit: false,
      });
    }

    if (debitIndex !== -1) {
      acc[debitIndex].amount += obj.amount;
      acc[debitIndex].isDebit = true;
    } else {
      acc.push({
        account: debitAccount,
        amount: obj.amount,
        isCredit: false,
        isDebit: true,
      });
    }

    return acc;
  }, []);

  const filteredOutput = writeOffOutput.filter((obj) => obj.isCredit && !obj.isDebit);
  const writeOffAccounts = filteredOutput.map((obj) => ({
    account: obj.account,
    amount: obj.amount,
    isDebit: obj.isDebit,
    isCredit: obj.isCredit,
    customer: invoice.customer,
  }));

  const accountList = [];
  accountArray.map((account) => {
    account.accounts.credit._id && accountList.push(account.accounts.credit);
    account.accounts.debit._id && accountList.push(account.accounts.debit);
  });

  const voidArray = accountList.map((subAccount) => {
    return {
      account: subAccount._id,
      name: subAccount.name,
      amount: 0,
      customer: invoice.customer,
      isDebit: true,
      isCredit: false,
    };
  });
  res.status(httpStatus.CREATED).send({
    data: {
      writeOff: writeOffAccounts,
      void: voidArray,
    },
  });
});

cron.schedule(
  '10 0 * * *',
  async () => {
    // const invoiceStatusCron = async () => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const filter = {
      is_deleted: 0,
      status: {
        $in: ['Due'],
      },
      due_date: {
        $lt: today,
      },
    };
    const result = await invoiceService.updateAllDueInvoices(filter);
    await logActivity(req.user._id, 'Updated invoices status', 'Overdue', 'user updated invoices status', result);
  },
  {
    scheduled: true,
    timezone: 'Asia/Dubai',
  }
);

const getInvoiceJournal = catchAsync(async (req, res) => {
  const accounts = await invoiceService.getInvoiceJournal(req.query.id);
  res.status(httpStatus.CREATED).send({
    data: {
      accounts,
    },
  });
});

const getInvoiceMailTemplate = catchAsync(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById(ObjectId(req.query.invoice));
  const { invoice_number, customer_name, total, invoice_date, due_date, customer, company } = invoice;
  const companyInfo = await companyService.getCompanyById(company);
  const template = `<div style=\"background: #fbfbfb;\"><div><div style=\"padding: 2% 3%;max-width: 150px;max-height:50px;\"></div></div><div style=\"padding:3%;text-align:center;background: #4190f2;\"> <div style=\"color:#fff;font-size:20px;font-weight:500;\">Invoice &nbsp; #${invoice_number}</div></div><div style=\"max-width:560px;margin:auto;padding: 0 3%;\"><div style=\"padding: 30px 0; color: #555;line-height: 1.7;\">Dear ${customer_name}, <br><br>Thank you for your business. Your invoice can be viewed, printed and downloaded as PDF from the link below.<br></div><div style=\"padding: 3%; background: #fefff1; border: 1px solid #e8deb5; color: #333;\"><div style=\"padding: 0 3% 3%; border-bottom: 1px solid #e8deb5; text-align: center;\"><h4 style=\"margin-bottom: 0;\">INVOICE AMOUNT</h4><h2 style=\"color: #D61916; margin-top: 10px;\">AED${total}</h2></div><div style=\"margin:auto; max-width:350px; padding: 3%;\"> <p><span style=\"width: 40%; padding-left: 10%; float:left; \">Invoice No</span><span style=\"width:40%; padding-left: 10%; display: inline-block;\"><b>${invoice_number}</b></span></p><p><span style=\"width: 40%; padding-left: 10%; float:left; \">Invoice Date</span><span style=\"width:40%; padding-left: 10%;\"><b>${invoice_date}</b></span></p><p><span style=\"width: 40%; padding-left: 10%; float:left; \">Due Date</span><span style=\"width: 40%; padding-left: 10%;\"><b>${due_date}</b></span></p> </div> <br> <div style=\"padding: 3% 0;line-height: 1.6;\"> Regards, <div style=\"color: #8c8c8c; font-weight: 400\"> ${req.user.first_name}</div><div style=\"color: #b1b1b1\">${companyInfo.company_name}</div></div></div> </div><br><br>`;
  const customerInfo = await customersService.getCustomerMailInfo(customer);
  const emailObj = {
    from: req.user.email,
    send_to: customerInfo.primary_contact.email,
    cc: customerInfo.email ? customerInfo.email : null,
    Subject: `Invoice - ${invoice_number} from company`,
    emailTemplate: template,
  };
  // result=emailObj
  res.status(httpStatus.CREATED).send({
    data: emailObj,
  });
});

module.exports = {
  createInvoice,
  getAll,
  addInvoice,
  updateInvoiceNoById,
  updateInvoice,
  recordPayment,
  createCreditNote,
  createDebitNote,
  createInvoiceLink,
  sendEmail,
  cancelInvoice,
  getAccountInfo,
  getInvoiceById,
  // invoiceStatusCron,
  getInvoiceJournal,
  getInvoiceMailTemplate,
};
