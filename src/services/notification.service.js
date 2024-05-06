const httpStatus = require('http-status');
const moment = require('moment');

const { Notification, Employee} = require('../models');
const ApiError = require('../utils/ApiError');

/**
 * Create a notification
 * @param {Object} notificationBody
 * @returns {Promise<Notification>}
 */
const createNotification = async (notificationBody) => {
  let body = notificationBody;

  return Notification.create(notificationBody);
};

/**
 * Query for notifications
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryNotifications = async (filter, options) => {
  const notifications = await Notification.paginate(filter, options);
  return notifications;
};

/**
 * Get notification by id
 * @param {ObjectId} id
 * @returns {Promise<Notification>}
 */
const getNotificationById = async (id) => {
  return Notification.findById(id);
};

/**
 * Update notification by id
 * @param {ObjectId} notificationId
 * @param {Object} updateBody
 * @returns {Promise<Notification>}
 */
const updateNotificationById = async (notificationId, updateBody, clientId) => {
  const notification = await Notification.findOne({ _id: notificationId, user_id: clientId });
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }
  if (updateBody.email && (await Notification.isEmailTaken(updateBody.email, notificationId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  let body = updateBody;

  return Notification.findOneAndUpdate({ _id: notification }, { $set: body }, { new: true });
};

/**
 * Delete notification by id
 * @param {ObjectId} notificationId
 * @returns {Promise<Notification>}
 */
const deleteNotificationById = async (notificationId) => {
  const notification = await getNotificationById(notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }
  await notification.remove();
  return notification;
};

const getUnreadNotificationsCount = async (loggedInEmployeeId) => {
  // return await Notification.find({ user_id: loggedInEmployeeId, read_by: { $ne: loggedInEmployeeId } }).countDocuments();
};
const readNotification = async (notificationId, loggedInEmployeeId) => {
  // return await Notification.findOneAndUpdate(
  //   { _id: notificationId },
  //   { $push: { read_by: loggedInEmployeeId } },
  //   { new: true }
  // );
};
const getTotalUnreadNotification = async (userId) => {
  // return Notification.countDocuments({ user_id: userId, read_by: { $ne: userId } });
};

const getDates = async (notifications) => {
  const dates = [];
  const today = new Date();
  const thisYear = today.getYear();
  const thisMonth = today.getMonth();
  const thisDay = today.getDate();

  const tom = new Date();
  tom.setDate(tom.getDate() - 1);
  const tomYear = tom.getYear();
  const tomMonth = tom.getMonth();
  const tomDay = tom.getDate();

  for (let index = 0, l = notifications.length; index < l; index += 1) {
    const notif = notifications[index];

    const dYear = notif.created_at.getYear();
    const dMonth = notif.created_at.getMonth();
    const day = notif.created_at.getDate();

    let value = ``;
    if (dYear === thisYear && dMonth === thisMonth && day === thisDay) {
      value = 'Today';
    } else if (dYear === tomYear && dMonth === tomMonth && day === tomDay) {
      value = 'Yesterday';
    } else {
      const month_name = moment().month(dMonth).format('MMMM');
      value = `${month_name} ${day}`;
    }

    notif.date_string = value;
    if (!dates.includes(value)) {
      dates.push(value);
    }
  }

  return dates;
};

const readAllUserNotification = async (userId) => {
  // return Notification.updateMany({ user_id: userId }, { $push: { read_by: userId } });
};

module.exports = {
  createNotification,
  queryNotifications,
  getNotificationById,
  updateNotificationById,
  deleteNotificationById,
  getUnreadNotificationsCount,
  readNotification,
  getTotalUnreadNotification,
  getDates,
  readAllUserNotification,
};
