// utils/verifyPaystack.js

const crypto = require('crypto');

function verifyPaystackSignature(req, secretKey) {
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(JSON.stringify(req.body))
    .digest('hex');

  const signature = req.headers['x-paystack-signature'];
  return signature === hash;
}

module.exports = {
  verifyPaystackSignature
};
