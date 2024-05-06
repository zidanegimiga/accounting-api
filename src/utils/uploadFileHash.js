const crypto = require('crypto');

/**
  Appends hash after the filename of your link
*/
const appendHash = async (link) => {

  const hash = crypto.randomBytes(20).toString('hex');
  let url = link;
  if (link.includes('__') === false) {
    const splitLink = link.split('.');
    const fileextension = splitLink[splitLink.length - 1];
    splitLink.pop();
    const filename = splitLink.join('.');
    url = `${filename}__${hash}.${fileextension}`;
  }
  return url;
};

module.exports = appendHash;
