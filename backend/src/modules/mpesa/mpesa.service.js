const axios = require('axios');
const sequelize = require('../../config/database');
const { QueryTypes } = require('sequelize');

const BASE_URL = 'https://sandbox.safaricom.co.ke';

const getAccessToken = async () => {
  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  try {
    const response = await axios.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      { headers: { Authorization: `Basic ${auth}` } }
    );

    return response.data.access_token;
  } catch (err) {
    const safeMessage = err.response?.data?.errorMessage
      || err.response?.data?.error_description
      || err.message
      || 'Failed to get M-Pesa access token.';
    console.error('M-Pesa access token error:', err.response?.data || err.message);
    throw new Error(safeMessage);
  }
};

const getTimestamp = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
};

const getPassword = (timestamp) => {
  const raw = `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`;
  return Buffer.from(raw).toString('base64');
};

const initiateSTKPush = async ({ phone, amount, accountReference, description, callbackUrl }) => {
  const token = await getAccessToken();
  const timestamp = getTimestamp();
  const password = getPassword(timestamp);

  const formattedPhone = phone.startsWith('0')
    ? '254' + phone.slice(1)
    : phone;

  const payload = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(Number(amount)),
    PartyA: formattedPhone,
    PartyB: process.env.MPESA_SHORTCODE,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference,
    TransactionDesc: description
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  } catch (err) {
    const safeMessage = err.response?.data?.errorMessage
      || err.response?.data?.ResponseDescription
      || err.message
      || 'Failed to initiate STK Push.';
    console.error('STK Push error:', err.response?.data || err.message);
    throw new Error(safeMessage);
  }
};

const createPendingTransaction = async ({ memberId, purpose, purposeId, amount, checkoutRequestId }) => {
  const [insertId] = await sequelize.query(
    'INSERT INTO mpesa_transactions SET member_id = ?, purpose = ?, purpose_id = ?, amount = ?, checkout_request_id = ?, status = ?',
    {
      replacements: [memberId, purpose, purposeId, amount, checkoutRequestId, 'PENDING'],
      type: QueryTypes.INSERT
    }
  );
  return insertId;
};

const handleCallback = async (callbackBody) => {
  const stkCallback = callbackBody.Body.stkCallback;
  const checkoutRequestId = stkCallback.CheckoutRequestID;
  const resultCode = stkCallback.ResultCode;

  const transactions = await sequelize.query(
    'SELECT * FROM mpesa_transactions WHERE checkout_request_id = ?',
    { replacements: [checkoutRequestId], type: QueryTypes.SELECT }
  );

  if (!transactions || transactions.length === 0) {
    console.log('No matching transaction found for checkout request:', checkoutRequestId);
    return;
  }

  const transaction = transactions[0];

  if (resultCode === 0) {
    await sequelize.query(
      "UPDATE mpesa_transactions SET status = 'SUCCESS', result_description = ? WHERE checkout_request_id = ?",
      { replacements: [stkCallback.ResultDesc, checkoutRequestId], type: QueryTypes.UPDATE }
    );

    if (transaction.purpose === 'CONTRIBUTION') {
      const { recordContribution } = require('../contributions/contribution.service');
      const details = JSON.parse(transaction.purpose_id);
      await recordContribution(
        {
          member_id: transaction.member_id,
          amount: transaction.amount,
          contribution_month: details.month,
          contribution_year: details.year
        },
        transaction.member_id,
        true
      );
    } else if (transaction.purpose === 'SAVINGS') {
      const { recordSavings } = require('../savings/savings.service');
      await recordSavings(
        {
          member_id: transaction.member_id,
          amount: transaction.amount,
          transaction_type: 'DEPOSIT',
          notes: 'Paid via M-Pesa'
        },
        transaction.member_id,
        true
      );
    }
  } else {
    await sequelize.query(
      "UPDATE mpesa_transactions SET status = 'FAILED', result_description = ? WHERE checkout_request_id = ?",
      { replacements: [stkCallback.ResultDesc, checkoutRequestId], type: QueryTypes.UPDATE }
    );
  }
};

const getTransactionStatus = async (checkoutRequestId) => {
  const transactions = await sequelize.query(
    'SELECT status, result_description FROM mpesa_transactions WHERE checkout_request_id = ?',
    { replacements: [checkoutRequestId], type: QueryTypes.SELECT }
  );

  if (!transactions || transactions.length === 0) {
    return { status: 'NOT_FOUND' };
  }

  return transactions[0];
};

module.exports = {
  initiateSTKPush,
  createPendingTransaction,
  handleCallback,
  getTransactionStatus
};