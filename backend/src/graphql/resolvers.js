const authResolvers = require('../modules/auth/auth.resolvers');
const memberResolvers = require('../modules/members/member.resolvers');

const resolvers = {
  Query: {
    ping: () => 'Uzalendo Chama API is running',
    ...memberResolvers.Query
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...memberResolvers.Mutation
  }
};

module.exports = resolvers;