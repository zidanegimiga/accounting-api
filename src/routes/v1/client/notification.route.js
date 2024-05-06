const express = require('express');

const router = express.Router();

const { notificationController } = require('../../../controllers');

const auth = require('../../../middlewares/auth');

router
  .route('/')
  .get(auth(), notificationController.getFreelancerNotifications)
  .post(auth(), notificationController.createNotification);

router.route('/by-id/:notificationId').put(auth(), notificationController.updateNotification);
router.patch('/:notification_id/read', auth(), notificationController.readNotification);

module.exports = router;
