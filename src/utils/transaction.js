const mongoose = require('mongoose');

let session = null;
const transaction = {
  startTransaction: async () => {
    session = await mongoose.startSession();
    session.startTransaction();
    return true;
  },
  commitTransaction: async () => {
    await session.commitTransaction();
    session.endSession();
    return true;
  },
  rollbackTransaction: async () => {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    return true;
  },
  getSession() {
    return session;
  },
};

module.exports = transaction;
