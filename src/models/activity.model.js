const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const activitiesSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    resource_id: {
      type: String,
      required: true,
    },
    changes: {
      type: Object,
    },
  },
  {
    timestamps: true,
  }
);

activitiesSchema.plugin(toJSON);
activitiesSchema.plugin(paginate);
module.exports = mongoose.model('activities', activitiesSchema);
