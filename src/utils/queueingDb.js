const mongoose = require('mongoose');

let conn = null;

module.exports = {
  getConnection: () => {
    if (!conn) {
      conn = mongoose.createConnection(process.env.QUEUE_DATABASE_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      });
    }
    return conn;
  },
};
