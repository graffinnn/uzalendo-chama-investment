const { applyForLoan, approveLoan, rejectLoan, recordRepayment, getLoanById, getOverdueLoans, getMyLoans, getAllLoans } = require('./loan.service');

const loanResolvers = {
  Query: {
    getMyLoans: async (_, __, { user }) => {
      if (!user || user.role !== 'MEMBER') throw new Error('Member access required.');
      return getMyLoans(user.id);
    },
    getAllLoans: async (_, __, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return getAllLoans();
    },
    getLoan: async (_, { loanId }, { user }) => {
      if (!user) throw new Error('Authentication required.');
      return getLoanById(loanId);
    },
    getOverdueLoans: async (_, __, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return getOverdueLoans();
    }
  },
  Mutation: {
    applyForLoan: async (_, { input }, { user }) => {
      if (!user || user.role !== 'MEMBER') throw new Error('Member access required.');
      return applyForLoan(input, user.id);
    },
    approveLoan: async (_, { loanId }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return approveLoan(loanId, user.id);
    },
    rejectLoan: async (_, { loanId }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return rejectLoan(loanId, user.id);
    },
    recordRepayment: async (_, { repaymentId }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return recordRepayment(repaymentId, user.id);
    }
  }
};

module.exports = loanResolvers;