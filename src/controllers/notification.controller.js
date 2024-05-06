const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { notificationService } = require('../services');

const createNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.createNotification(req.body);
  res.status(httpStatus.CREATED).json(notification);
});

const getNotifications = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role', 'user_id']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await notificationService.queryNotifications(filter, options);
  const unreadCount = await notificationService.getUnreadNotificationsCount(filter.user_id);
  res.json({ ...result, unreadCount });
});

const getFreelancerNotifications = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  filter.user_id = req.user.id;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await notificationService.queryNotifications(filter, options);
  const unreadCount = await notificationService.getUnreadNotificationsCount(req.user.id);
  res.json({ ...result, unreadCount });
});

const getNotificationsWithDates = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  filter.user_id = req.user.id;
  const result = await notificationService.queryNotifications(filter, options);
  const dates = await notificationService.getDates(result.results);
  res.json({ ...result, dates });
});

const getNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.getNotificationById(req.params.notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }
  res.json(notification);
});

const updateNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.updateNotificationById(req.params.notificationId, req.body);
  res.json(notification);
});

const deleteNotification = catchAsync(async (req, res) => {
  await notificationService.deleteNotificationById(req.params.notificationId);
  res.status(httpStatus.NO_CONTENT).send();
});

const readNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.readNotification(req.params.notification_id, req.user.id);
  const unreadCount = await notificationService.getUnreadNotificationsCount(req.user.id);
  res.json({ notification, unreadCount });
});

const readAllUserNotification = catchAsync(async (req, res) => {
  const { freelancer_id } = req.body;
  const notification = await notificationService.readAllUserNotification(req.user.id);
  const unreadCount = await notificationService.getUnreadNotificationsCount(req.user.id);
  res.json({ notification, unreadCount, userId: req.user.id });
});

module.exports = {
  createNotification,
  getNotifications,
  getFreelancerNotifications,
  getNotification,
  updateNotification,
  deleteNotification,
  getNotificationsWithDates,
  readNotification,
  readAllUserNotification,
};
