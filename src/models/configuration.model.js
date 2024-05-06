const mongoose = require('mongoose');

const ConfigurationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
    },
    fields: {
      type: Object,
    },
    // isDeleted: {
    //   type: Number,
    //   default: 0,
    // },
  },
  // {
  //   timestamps: true,
  // }
);


module.exports = mongoose.model('configuration', ConfigurationSchema);
