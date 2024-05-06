const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createInvoice = {
  body: Joi.object().keys({
    customer: Joi.string().custom(objectId).required(),
    email: Joi.object().required(),
    billing_address: Joi.string().required(),
    terms: Joi.string().custom(objectId).required(),
    invoice_date: Joi.date().required(),
    due_date: Joi.date().required(),
    sale_location: Joi.string().required(),
    journal_entry: Joi.array()
      .items(
        Joi.object({
          account: Joi.string().required(),
          description: Joi.string().required(),
          customer: Joi.string().required(),
          isDebit: Joi.boolean().required(),
          isCredit: Joi.boolean().required(),
          amount: Joi.number().required(),
        })
      )
      .required(),
    items: Joi.array().required(),
    total: Joi.number().required(),
    sub_total: Joi.number().required(),
    tax: Joi.number().required(),
    invoice_message: Joi.string().required(),
    statement_message: Joi.string().required(),
  }),
};

const createInvoiceTemplate = {
  body: Joi.object().keys({
    customer: Joi.string().custom(objectId).required(),
    email: Joi.object().required(),
    billing_address: Joi.string().required(),
    terms: Joi.string().custom(objectId).required(),
    sale_location: Joi.string().required(),
    items: Joi.array().required(),
    total: Joi.number().required(),
    sub_total: Joi.number().required(),
    tax: Joi.number().required(),
    invoice_message: Joi.string().required(),
    statement_message: Joi.string().required(),
    is_scheduled: Joi.boolean().required(),
    recurring_frequency: Joi.number().required(),
    advance_scheduling_days: Joi.number().required(),
  }),
};

const getInvoice = {
  params: Joi.object().keys({
    id: Joi.string().custom(objectId),
  }),
};

const recordPayment = {
  body: Joi.object().keys({
    customer: Joi.string().custom(objectId).required(),
    invoice: Joi.object().required(),
    amount: Joi.string().required(),
    payment_date: Joi.string().custom(objectId).required(),
    payment_mode: Joi.string().required(),
    deposit_to: Joi.array().required(),
    is_thanks_required: Joi.number().required(),
  }),
};

const createJournalEntry = {
  body: Joi.object().keys({
    company: Joi.string().custom(objectId).required(),
    journal_date: Joi.date().required(),
    line_items: Joi.array().required(),
    total: Joi.number().required(),
    sub_total: Joi.number().required(),
    vat_total: Joi.number().required(),
  })

};

module.exports = {
  createInvoice,
  createInvoiceTemplate,
  getInvoice,
  createJournalEntry
};
