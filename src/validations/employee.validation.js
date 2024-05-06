const Joi = require('joi');

const createEmployee = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    phone: Joi.string().required(),
    freelancer_type: Joi.string(),
    countryCode: Joi.string(),
  }),
};

const employee = {
  params: Joi.object().keys({
    employee_id: Joi.string().required(),
  }),
};

const getEmployeeByEmail = {
  params: Joi.object().keys({
    email: Joi.string().required().email(),
  }),
}

const getRequests = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const updateEmployeeById = {
  params: Joi.object().keys({
    employee_id: Joi.string().required(),
  }),
};

const getEmployeeById = {
  params: Joi.object().keys({
    employee_id: Joi.string().required(),
  }),
};

const rotationDownload={
  body: Joi.object().keys({
    start: Joi.string().required(),
    end: Joi.string().required(),
  }),
};

const updatePersonalInfo = {
  body: Joi.object().keys({
    phone: Joi.string(),
    dob: Joi.string(),
    gender: Joi.string(),
    marital_status: Joi.string(),
    nationality: Joi.string(),
    location: Joi.string(),
    bldg_street: Joi.string(),
    unit_no: Joi.string(),
    city: Joi.string(),
    emirate: Joi.string(),
  }),
};

const updateContactInfo = {
  body: Joi.object().keys({
    home_contact_full_name: Joi.string(),
    home_contact_relationship: Joi.string(),
    home_contact_email: Joi.string(),
    home_contact_phone: Joi.string(),
    home_contact_address: Joi.string(),
    country: Joi.string(),
    emergency: Joi.object(),
  }),
};

const updateByHash = {
  body: Joi.object().keys({
    token: Joi.string(),
    complete_address: Joi.string(),
    residence_contact_name: Joi.string(),
    residence_contact_number: Joi.string(),
  }),
};

module.exports = {
  createEmployee,
  employee,
  getRequests,
  updateEmployeeById,
  getEmployeeById,
  rotationDownload,
  updatePersonalInfo,
  updateContactInfo,
  updateByHash,
};
