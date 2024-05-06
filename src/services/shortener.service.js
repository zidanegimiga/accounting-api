const axios = require('axios');
/**
 * send sms for queueing
 * @param {String} number
 * @param {String} message
 * @param {Boolean} isSme
 * @param {String} referenceId
 * @param {String} collectionName
 * @param {date} dateToRelease
 * @returns {void}
 */
const shorten = async (url) => {
  const resMessage = await axios({
    method: 'post',
    url: 'https://api-ssl.bitly.com/v4/shorten',
    headers: { Authorization: `Bearer ${process.env.BITLY_TOKEN}`, 'Content-Type': 'application/json' },
    data: `{ "long_url": "${url}", "domain": "bit.ly", "group_guid": "${process.env.BITLY_GUID}" }`,
  });
  return resMessage.data.link;
};

module.exports = {
  shorten,
};
