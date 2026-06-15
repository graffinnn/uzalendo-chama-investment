const { recordContribution, getMemberContributions, getPoolTotal, getAllContributions } = require('./contribution.service');

const contributionResolvers = {
  Query: {
    getMemberContributions: async (_, { memberId }, { user }) => {
      if (!user) throw new Error('Authentication required.');
      if (user.role === 'MEMBER' && user.id !== parseInt(memberId)) {
        throw new Error('You can only view your own contributions.');
      }
      return getMemberContributions(memberId);
    },
    getAllContributions: async (_, __, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return getAllContributions();
    },
    getPoolTotal: async (_, __, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      const total = await getPoolTotal();
      return parseFloat(total);
    }
  },
  Mutation: {
    recordContribution: async (_, { input }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return recordContribution(input, user.id);
    }
  }
};

module.exports = contributionResolvers;