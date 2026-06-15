const { getAllMembers, getMemberById, activateMember, deactivateMember } = require('./member.service');

const memberResolvers = {
  Query: {
    getMembers: async (_, __, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return getAllMembers();
    },
    getMember: async (_, { id }, { user }) => {
      if (!user) throw new Error('Authentication required.');
      if (user.role === 'MEMBER' && user.id !== parseInt(id)) {
        throw new Error('You can only view your own profile.');
      }
      return getMemberById(id);
    }
  },
  Mutation: {
    activateMember: async (_, { memberId }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return activateMember(memberId, user.id);
    },
    deactivateMember: async (_, { memberId }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return deactivateMember(memberId, user.id);
    }
  }
};

module.exports = memberResolvers;