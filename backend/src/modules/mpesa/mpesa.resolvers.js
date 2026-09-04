const {
  initiateSTKPush,
  createPendingTransaction,
  getTransactionStatus
} = require('./mpesa.service');

const VALID_PURPOSES = ['CONTRIBUTION', 'SAVINGS'];

const mpesaResolvers = {
  Query: {
    getMpesaTransactionStatus: async (_, { checkoutRequestId }, { user }) => {
      if (!user) throw new Error('Authentication required.');
      return getTransactionStatus(checkoutRequestId);
    }
  },
  Mutation: {
    initiateStkPush: async (_, { input }, { user }) => {
      if (!user || user.role !== 'MEMBER') throw new Error('Member access required.');

      const { phone, amount, purpose, contributionMonth, contributionYear } = input;

      if (!VALID_PURPOSES.includes(purpose)) {
        throw new Error(`Invalid purpose. Must be one of: ${VALID_PURPOSES.join(', ')}`);
      }

      let purposeId = null;
      if (purpose === 'CONTRIBUTION') {
        if (!contributionMonth || !contributionYear) {
          throw new Error('contributionMonth and contributionYear are required for CONTRIBUTION payments.');
        }
        purposeId = JSON.stringify({ month: contributionMonth, year: contributionYear });
      }

      const callbackUrl = `${process.env.MPESA_CALLBACK_URL}`;

      const stkResponse = await initiateSTKPush({
        phone,
        amount,
        accountReference: `Chama-${user.id}`,
        description: purpose === 'CONTRIBUTION' ? 'Chama contribution' : 'Chama savings deposit',
        callbackUrl
      });

      if (!stkResponse.CheckoutRequestID) {
        throw new Error(stkResponse.errorMessage || 'Failed to initiate STK Push.');
      }

      await createPendingTransaction({
        memberId: user.id,
        purpose,
        purposeId,
        amount,
        checkoutRequestId: stkResponse.CheckoutRequestID
      });

      return {
        checkoutRequestId: stkResponse.CheckoutRequestID,
        merchantRequestId: stkResponse.MerchantRequestID,
        responseCode: stkResponse.ResponseCode,
        responseDescription: stkResponse.ResponseDescription,
        customerMessage: stkResponse.CustomerMessage
      };
    }
  }
};

module.exports = mpesaResolvers;