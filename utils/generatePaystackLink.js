const axios = require('axios');
require('dotenv').config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL;

/**
 * Generates a Paystack payment link with metadata
 * @param {Object} options
 * @param {string} options.userId - Discord user ID
 * @param {string} options.amount - Amount in kobo (₦1000 = 100000)
 * @param {string} options.description - Description of payment
 * @param {Object} options.metadata - Additional metadata for tracking (e.g., { pillType: 'red' })
 * @returns {Promise<string>} The payment link URL
 */
async function generatePaystackLink({ userId, amount, description, metadata }) {
  try {
    const reference = `${metadata?.pillType || metadata?.type || 'pay'}_${userId}_${Date.now()}`;

    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount, // in kobo
        email: `${userId}@fake.email`, // fallback email; you can replace with real email if stored
        reference,
        callback_url: CALLBACK_URL,
        metadata: {
          discordUserId: userId,
          ...metadata,
        },
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
    console.error('❌ Failed to generate Paystack link:', err?.response?.data || err);
    throw new Error('Failed to create Paystack payment link.');
  }
}

module.exports = generatePaystackLink;
