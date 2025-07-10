const axios = require('axios');
require('dotenv').config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL;

/**
 * Generates a Paystack payment link with metadata
 * @param {Object} options
 * @param {number} options.amount - Amount in kobo (₦1000 = 100000)
 * @param {string} options.email - Email of the payer (fallback if Discord doesn't provide)
 * @param {string} options.reference - Unique reference ID to track transaction
 * @param {Object} options.metadata - Additional metadata (e.g., { pillType: 'red', category: 'boost' })
 * @returns {Promise<string>} - The Paystack payment link
 */
async function generatePaystackLink({ amount, email, reference, metadata = {} }) {
  try {
    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount,
        email,
        reference,
        callback_url: CALLBACK_URL,
        metadata,
        channels: ['card', 'bank', 'ussd', 'mobile_money'],
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return res.data.data.authorization_url;
  } catch (err) {
    console.error('❌ Failed to generate Paystack link:', err?.response?.data || err.message);
    throw new Error('Failed to create Paystack payment link.');
  }
}

module.exports = generatePaystackLink;
