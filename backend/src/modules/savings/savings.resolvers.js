const {
  recordSavings,
  getMemberSavingsBalance,
  getMemberSavingsHistory,
  requestWithdrawal,
  approveWithdrawal,
  getPendingWithdrawals
} = require('./savings.service');

const savingsResolvers = {
  Query: {
    getMySavingsBalance: async (_, __, { user }) => {
      if (!user || user.role !== 'MEMBER') throw new Error('Member access required.');
      const balance = await getMemberSavingsBalance(user.id);
      return balance;
    },
    getMemberSavingsBalance: async (_, { memberId }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      const balance = await getMemberSavingsBalance(memberId);
      return balance;
    },
    getMySavingsHistory: async (_, __, { user }) => {
      if (!user || user.role !== 'MEMBER') throw new Error('Member access required.');
      return getMemberSavingsHistory(user.id);
    },
    getPendingWithdrawals: async (_, __, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return getPendingWithdrawals();
    }
  },
  Mutation: {
    recordSavings: async (_, { input }, { user }) => {
      if (!user) throw new Error('Authentication required.');

      if (user.role === 'MEMBER') {
        if (parseInt(input.member_id) !== user.id) {
          throw new Error('You can only record savings for yourself.');
        }
        return recordSavings(input, user.id, true);
      }

      return recordSavings(input, user.id, false);
    },
    requestWithdrawal: async (_, { input }, { user }) => {
      if (!user || user.role !== 'MEMBER') throw new Error('Member access required.');
      return requestWithdrawal(input, user.id);
    },
    approveWithdrawal: async (_, { withdrawalId }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return approveWithdrawal(withdrawalId, user.id);
    }
  }
};

module.exports = savingsResolvers;