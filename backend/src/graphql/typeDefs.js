const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Query {
    ping: String
    getMembers: [Member!]!
    getMember(id: ID!): Member!
    getMemberContributions(memberId: ID!): [Contribution!]!
    getAllContributions: [Contribution!]!
    getPoolTotal: Float!
  }

  type Mutation {
    registerAdmin(input: RegisterAdminInput!): Admin!
    loginAdmin(email: String!, password: String!): AdminAuthPayload!
    registerMember(input: RegisterMemberInput!): Member!
    loginMember(phone: String!, password: String!): MemberAuthPayload!
    activateMember(memberId: ID!): Member!
    deactivateMember(memberId: ID!): Member!
    recordContribution(input: RecordContributionInput!): Contribution!
  }

  type Admin {
    id: ID!
    full_name: String!
    email: String!
    phone: String!
    created_at: String
  }

  type AdminAuthPayload {
    token: String!
    admin: Admin!
  }

  type Member {
    id: ID!
    full_name: String!
    phone: String!
    national_id: String!
    member_number: String!
    status: String!
    loan_limit: Float
    joined_at: String
    overall_score: Float
    contribution_score: Float
    loan_score: Float
  }

  type MemberAuthPayload {
    token: String!
    member: Member!
  }

  type Contribution {
    id: ID!
    amount: Float!
    contribution_month: Int!
    contribution_year: Int!
    recorded_at: String
    member_name: String
    member_number: String
  }

  input RegisterAdminInput {
    full_name: String!
    email: String!
    phone: String!
    password: String!
  }

  input RegisterMemberInput {
    full_name: String!
    phone: String!
    national_id: String!
    password: String!
  }

  input RecordContributionInput {
    member_id: ID!
    amount: Float!
    contribution_month: Int!
    contribution_year: Int!
  }
`;

module.exports = typeDefs;