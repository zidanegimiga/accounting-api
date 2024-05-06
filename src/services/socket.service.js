const socketAPI = require('../config/socket');

/**
 * Sends a broadcast to a particular user on notification updates
 * @param {String} userId
 * @param {Object} body to transmit
 * @returns {Promise<User>}
 */
const updateNotificationByUserId = async (userId, body) => {
  return socketAPI.io.emit(`notification-${userId}`, body);
};

module.exports = {
  updateNotificationByUserId,
};
