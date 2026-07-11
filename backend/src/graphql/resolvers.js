const authResolvers = require('../modules/auth/auth.resolvers');
const memberResolvers = require('../modules/members/member.resolvers');
const contributionResolvers = require('../modules/contributions/contribution.resolvers');
const cycleResolvers = require('../modules/cycles/cycle.resolvers');
const savingsResolvers = require('../modules/savings/savings.resolvers');
const loanResolvers = require('../modules/loans/loan.resolvers');
const scoreResolvers = require('../modules/scores/score.resolvers');
const investmentResolvers = require('../modules/investments/investment.resolvers');
const dashboardResolvers = require('../modules/reports/dashboard.resolvers');

const resolvers = {
  Query: {
    ping: () => 'Uzalendo Chama API is running',
    ...memberResolvers.Query,
    ...contributionResolvers.Query,
    ...cycleResolvers.Query,
    ...savingsResolvers.Query,
    ...loanResolvers.Query,
    ...scoreResolvers.Query,
    ...investmentResolvers.Query,
    ...dashboardResolvers.Query
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...memberResolvers.Mutation,
    ...contributionResolvers.Mutation,
    ...cycleResolvers.Mutation,
    ...savingsResolvers.Mutation,
    ...loanResolvers.Mutation,
    ...investmentResolvers.Mutation
  }
};

module.exports = resolvers;