const express = require('express');
const { handleCallback } = require('./mpesa.service');

const router = express.Router();

router.post('/callback', async (req, res) => {
  try {
    console.log('M-Pesa callback received:', JSON.stringify(req.body));
    await handleCallback(req.body);
  } catch (err) {
    console.error('Error processing M-Pesa callback:', err);
  }

  // Always respond 200 to Safaricom, even on internal error —
  // Safaricom retries aggressively on non-200, which would just
  // repeat the same failure. We log the error above and can chase
  // it manually via mpesa_transactions.status = 'PENDING' instead.
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

module.exports = router;