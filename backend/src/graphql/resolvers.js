const authResolvers = require('../modules/auth/auth.resolvers');
const memberResolvers = require('../modules/members/member.resolvers');
const contributionResolvers = require('../modules/contributions/contribution.resolvers');
const cycleResolvers = require('../modules/cycles/cycle.resolvers');
const savingsResolvers = require('../modules/savings/savings.resolvers');
const loanResolvers = require('../modules/loans/loan.resolvers');

const resolvers = {
  Query: {
    ping: () => 'Uzalendo Chama API is running',
    ...memberResolvers.Query,
    ...contributionResolvers.Query,
    ...cycleResolvers.Query,
    ...savingsResolvers.Query,
    ...loanResolvers.Query
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...memberResolvers.Mutation,
    ...contributionResolvers.Mutation,
    ...cycleResolvers.Mutation,
    ...savingsResolvers.Mutation,
    ...loanResolvers.Mutation
  }
};

module.exports = resolvers;