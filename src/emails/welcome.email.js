const config = require('../config/config');

const email = {
  subject: () => `Welcome to my App`,
  html: async (freelancer, token) => {
    return 'Please enter your body';
  },
};

module.exports = email;
