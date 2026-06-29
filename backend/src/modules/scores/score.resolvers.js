const { getMemberScore, getAllMemberScores, getScoreHistory } = require('./score.service');

const scoreResolvers = {
  Query: {
    getMyScore: async (_, __, { user }) => {
      if (!user || user.role !== 'MEMBER') throw new Error('Member access required.');
      return getMemberScore(user.id);
    },
    getMemberScore: async (_, { memberId }, { user }) => {
      if (!user) throw new Error('Authentication required.');
      if (user.role === 'MEMBER' && user.id !== parseInt(memberId)) {
        throw new Error('You can only view your own score.');
      }
      return getMemberScore(memberId);
    },
    getAllMemberScores: async (_, __, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return getAllMemberScores();
    },
    getMyScoreHistory: async (_, __, { user }) => {
      if (!user || user.role !== 'MEMBER') throw new Error('Member access required.');
      return getScoreHistory(user.id);
    },
    getMemberScoreHistory: async (_, { memberId }, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return getScoreHistory(memberId);
    }
  }
};

module.exports = scoreResolvers;