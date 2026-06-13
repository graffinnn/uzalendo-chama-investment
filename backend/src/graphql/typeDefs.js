const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Query {
    ping: String
  }

  type Mutation {
    _empty: String
  }
`;

module.exports = typeDefs;