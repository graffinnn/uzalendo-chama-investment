const { createCycle, getCurrentCycle, getMyCyclePosition, getCyclePositions, completeCycle } = require('./cycle.service');

const cycleResolvers = {
  Query: {
    getCurrentCycle: async (_, __, { user }) => {
      if (!user) throw new Error('Authentication required.');
      return getCurrentCycle();
    },
    getMyCyclePosition: async (_, __, { user }) => {
      if (!user || user.role !== 'MEMBER') throw new Error('Member access required.');
      return getMyCyclePosition(user.id);
    },
    getCyclePositions: async (_, { cycleId }, { user }) => {
      if (!user) throw new Error('Authentication required.');
      return getCyclePositions(cycleId);
    }
  },
  Mutation: {
    createCycle: async (_, { input }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return createCycle(input, user.id);
    },
    completeCycle: async (_, { cycleId }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return completeCycle(cycleId, user.id);
    }
  }
};

module.exports = cycleResolvers;