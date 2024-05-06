const mongoose = require('mongoose');
const { toJSON, paginate, deletion } = require('./plugins');

const JournalLogSchema = new mongoose.Schema(
  {
    journal_number: {
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

JournalLogSchema.plugin(toJSON);
JournalLogSchema.plugin(paginate);
JournalLogSchema.plugin(deletion);


module.exports = mongoose.model('journal_logs', JournalLogSchema);
