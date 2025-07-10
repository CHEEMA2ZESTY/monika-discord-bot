// utils/verifyPaystack.js

const crypto = require('crypto');

function verifyPaystackSignature(rawBody, signature, secretKey) {
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex');

  return signature === hash;
}

module.exports = {
  verifyPaystackSignature
};
