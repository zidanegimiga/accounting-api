const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

const costCenterSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    company:{
      type:ObjectId,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    is_deleted: {
      type: Number,
      default: 0,
    },
    status: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('cost_center', costCenterSchema);
