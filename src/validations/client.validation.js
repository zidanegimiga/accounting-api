const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const createClient = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
  }),
};

const getClients = {
  query: Joi.object().keys({
    freelancer_id: Joi.string().custom(objectId),
    name: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getClient = {
  params: Joi.object().keys({
    client_id: Joi.string().custom(objectId),
  }),
};

const updateClient = {
  params: Joi.object().keys({
    client_id: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string(),
    })
    .min(1),
};

const deleteClient = {
  params: Joi.object().keys({
    client_id: Joi.string().custom(objectId),
  }),
};

const updateDocuments = {
  params: Joi.object().keys({
    client_id: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      attachments: Joi.object(),
    })
    .min(1),
};

module.exports = {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  updateDocuments,
};
