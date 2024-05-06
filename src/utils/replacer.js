const moment = require('moment');
const configService = require('../services/configuration.service');
const userService = require('../services/user.service');
const employeeService = require('../services/employee.service');

/**
 * Replace dynamic variables
 * @param {string} to
 * @param {NotificationTemplate} template
 * @returns {Promise}
 */
const replaceOnboardingStrings = async (text, freelancer) => {
  let body = text;
  body = body.replace(/{{FREELANCER_FULL_NAME}}/g, freelancer.getFullName());
  body = body.replace(/{{FREELANCER_FIRST_NAME}}/g, freelancer.first_name);
  body = body.replace(/{{FREELANCER_LAST_NAME}}/g, freelancer.last_name);
  body = body.replace(/{{FREELANCER_MOBILE_NUMBER}}/g, freelancer.phone);
  body = body.replace(/{{FREELANCER_EMAIL}}/g, freelancer.email);
  body = body.replace(/{{CONTRACT_RENEWAL_INVOICE_NO}}/g, freelancer.contract_renewal_invoice_no);
  body = body.replace(/{{GRACE_PERIOD_DATE}}/g, moment(new Date(freelancer.grace_period_date)).format('DD MMMM YYYY'));
  body = body.replace(/{{LABOUR_CARD_NO}}/g, freelancer.documents.labourcard.number);
  // body = body.replace(/{{APPOINTMENT_DATE}}/g,  moment(new Date(client.eid_appointment_date)).format('DD MMMM YYYY'));
  // body = body.replace(/{{APPOINTMENT_TIME}}/g, moment(client.eid_appointment_time, 'HH:mm').format('hh:mm A'));

  if (body.includes('{{APPOINTMENT_DATE}}')) {
    if (freelancer.eid_appointment_date) {
      body = body.replace(/{{APPOINTMENT_DATE}}/g, moment(new Date(freelancer.eid_appointment_date)).format('DD MMMM YYYY'));
    }
  }

  if (body.includes('{{APPOINTMENT_TIME}}')) {
    if (freelancer.eid_appointment_time) {
      body = body.replace(/{{APPOINTMENT_TIME}}/g, moment(freelancer.eid_appointment_time, 'HH:mm').format('hh:mm A'));
    }
  }

  if (body.includes('{{PRIMARY_STAFF_NAME}}') || freelancer.support_agent_primary) {
    const primary = await userService.getUserById(freelancer.support_agent_primary);
    if (primary) {
      body = body.replace(/{{PRIMARY_STAFF_NAME}}/g, primary.getFullName());
    }
  }

  if (body.includes('{{SECONDARY_STAFF_NAME}}') || freelancer.support_agent_secondary) {
    const secondary = await userService.getUserById(freelancer.support_agent_secondary);
    if (secondary) {
      body = body.replace(/{{SECONDARY_STAFF_NAME}}/g, secondary.getFullName());
    }
  }

  body = body.replace(/{{PACKAGE}}/g, freelancer.contact_number);
  body = body.replace(/{{COMPANY}}/g, freelancer.freelancer_type);

  if (body.includes('{{MEDICAL_CENTER}}') || body.includes('{{EID_CENTER}}') || body.includes('{{COMPANY_ADDRESS}}')) {
    const configuration = await configService.getConfigurations();

    const medicalCenter = configuration[0].medical_centers.find((el) => el.name === freelancer.medical_center);
    if (medicalCenter) {
      body = body.replace(/{{MEDICAL_CENTER}}/g, medicalCenter.name);
      body = body.replace(/{{MEDICAL_CENTER_ADDRESS}}/g, medicalCenter.address);
      body = body.replace(/{{MEDICAL_CENTER_TIMING}}/g, medicalCenter.timings);
      body = body.replace(/{{MEDICAL_CENTER_LOCATION}}/g, medicalCenter.location);
    }
    const eidCenter = configuration[0].eid_centers.find((el) => el.name === freelancer.eid_center);
    if (eidCenter) {
      body = body.replace(/{{EID_CENTER}}/g, eidCenter.name);
      body = body.replace(/{{EID_CENTER_ADDRESS}}/g, eidCenter.address);
      body = body.replace(/{{EID_CENTER_LOCATION}}/g, eidCenter.location);
      body = body.replace(/{{EID_CENTER_TIMING}}/g, eidCenter.timings);
    }
    if (freelancer.freelancer_type =='Executive Freelancer') {
      body = body.replace(/{{COMPANY_ADDRESS}}/g, 'Office 2904 Reem Island, Sky Tower, Abu Dhabi, UAE');
    }
    else
    {
      body = body.replace(/{{COMPANY_ADDRESS}}/g, 'Office No. 1006, 10th Floor, Marina Plaza, Dubai, United Arab Emirates');
    }
    if (freelancer.freelancer_type =='Executive Freelancer') {
      body = body.replace(/{{COMPANY_PHONE}}/g, 'Ph:+971 2 444 6677');
    }
    else
    {
      body = body.replace(/{{COMPANY_PHONE}}/g, 'Ph:+971 4 354 4466');
    }
  }

  // body = body.replace(/{{FREELANCER_LOCATION}}/g, client.contact_number);
  body = body.replace(/{{FREELANCER_PROCESS_TYPE}}/g, freelancer.process_type);
  body = body.replace(/{{SENDING_DATE}}/g, new Date());

  return body;
};

const replaceNotifNameStrings = async (text, freelancer) => {
  let body = text;
  body = body.replace(/{{FREELANCER_FULL_NAME}}/g, freelancer.getFullName());
  return body;
};

module.exports = {
  replaceOnboardingStrings,
  replaceNotifNameStrings,
};
