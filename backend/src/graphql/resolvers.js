const authResolvers = require('../modules/auth/auth.resolvers');

const resolvers = {
  Query: {
    ping: () => 'Uzalendo Chama API is running'
  },
  Mutation: {
    ...authResolvers.Mutation
  }
};

module.exports = resolvers;