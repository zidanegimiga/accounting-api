const mongoose = require('mongoose');
const { toJSON, paginate, deletion } = require('./plugins');

const invoiceLogSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    user: {
      type: Object,
      required: true,
    },
    module: {
      type: String,
      required: true,
    },
    module_info: {
      type: Object,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
    },
    isDeleted: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

invoiceLogSchema.plugin(toJSON);
invoiceLogSchema.plugin(paginate);
invoiceLogSchema.plugin(deletion);


module.exports = mongoose.model('invoice_logs', invoiceLogSchema);
