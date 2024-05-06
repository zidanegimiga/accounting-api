const Joi = require('joi');

const readAllUserNotification = {
  params: Joi.object().keys({
    freelancer_id: Joi.string().required(),
  }),
};
module.exports = {
  readAllUserNotification,
};
