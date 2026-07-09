const { addInvestment, updateInvestmentValue, getInvestmentById, getPortfolio, getMyPortfolioShare } = require('./investment.service');

const investmentResolvers = {
  Query: {
    getPortfolio: async (_, __, { user }) => {
      if (!user) throw new Error('Authentication required.');
      return getPortfolio();
    },
    getInvestment: async (_, { investmentId }, { user }) => {
      if (!user) throw new Error('Authentication required.');
      return getInvestmentById(investmentId);
    },
    getMyPortfolioShare: async (_, __, { user }) => {
      if (!user || user.role !== 'MEMBER') throw new Error('Member access required.');
      return getMyPortfolioShare(user.id);
    }
  },
  Mutation: {
    addInvestment: async (_, { input }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return addInvestment(input, user.id);
    },
    updateInvestmentValue: async (_, { investmentId, newValue }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return updateInvestmentValue(investmentId, newValue, user.id);
    }
  }
};

module.exports = investmentResolvers;