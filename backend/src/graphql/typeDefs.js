const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Query {
    ping: String
  }

  type Mutation {
    registerAdmin(input: RegisterAdminInput!): Admin!
    loginAdmin(email: String!, password: String!): AdminAuthPayload!
    registerMember(input: RegisterMemberInput!): Member!
    loginMember(phone: String!, password: String!): MemberAuthPayload!
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
    joined_at: String
  }

  type MemberAuthPayload {
    token: String!
    member: Member!
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
`;

module.exports = typeDefs;