const mongoose = require('mongoose');

const { toJSON, paginate } = require('./plugins');

const notificationsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
    },
    subtype: {
      type: String,
    },
    item_id: {
      type: String,
    },
    description: {
      type: String,
    },
    create_by: {
      type: String,
    },
    user_id: {
      type: Array,
    },
    read_by: {
      type: Array,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
    },
    createdDate: {
      type: Date,
      default: Date.now,
    },
    date_string: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at', // Use `date_created` to store the created date
      updatedAt: 'updated_at', // and `date_updated` to store the last updated date
    },
  }
);

notificationsSchema.plugin(toJSON);
notificationsSchema.plugin(paginate);

notificationsSchema.post('save', async function (doc, next) {
  try {
    // const data = doc;
  } catch (err) {
    console.log(err);
  }
  next();
});

notificationsSchema.post('create', async function (doc, next) {
  try {
    // const data = doc;

    // PUSH NOTIFICATION SECTION
    // if (data.user_id.length > 0) {
    //   const topic = `fr_${data.user_id[0]}`;
    //   firebaseService.sendPush(topic, data.type, data.description, {
    //     type: data.type,
    //     item_id: data.item_id,
    //   });
    // }
  } catch (err) {
    console.log(err);
  }
  next();
});

module.exports = mongoose.model('Notification', notificationsSchema);
