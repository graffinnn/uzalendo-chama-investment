const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Query {
    ping: String
    getMembers: [Member!]!
    getMember(id: ID!): Member!
    getMemberContributions(memberId: ID!): [Contribution!]!
    getAllContributions: [Contribution!]!
    getPoolTotal: Float!
    getCurrentCycle: Cycle
    getMyCyclePosition: CyclePosition
    getCyclePositions(cycleId: ID!): [CyclePosition!]!
    getMySavingsBalance: Float!
    getMemberSavingsBalance(memberId: ID!): Float!
    getMySavingsHistory: [Saving!]!
    getPendingWithdrawals: [SavingsWithdrawal!]!
  }

  type Mutation {
    registerAdmin(input: RegisterAdminInput!): Admin!
    loginAdmin(email: String!, password: String!): AdminAuthPayload!
    registerMember(input: RegisterMemberInput!): Member!
    loginMember(phone: String!, password: String!): MemberAuthPayload!
    activateMember(memberId: ID!): Member!
    deactivateMember(memberId: ID!): Member!
    recordContribution(input: RecordContributionInput!): Contribution!
    createCycle(input: CreateCycleInput!): Cycle!
    completeCycle(cycleId: ID!): Cycle!
    recordSavings(input: RecordSavingsInput!): Saving!
    requestWithdrawal(input: WithdrawalInput!): SavingsWithdrawal!
    approveWithdrawal(withdrawalId: ID!): SavingsWithdrawal!
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

  type Cycle {
    id: ID!
    payout_amount: Float!
    start_date: String!
    status: String!
    created_at: String
    total_positions: Int
    positions: [CyclePosition]
  }

  type CyclePosition {
    id: ID!
    position_number: Int!
    expected_payout_date: String!
    actual_payout_date: String
    status: String!
    member_name: String
    member_number: String
    member_id: ID
    payout_amount: Float
  }

  type Saving {
    id: ID!
    amount: Float!
    transaction_type: String!
    notes: String
    recorded_at: String
    member_name: String
    member_number: String
  }

  type SavingsWithdrawal {
    id: ID!
    amount: Float!
    reason: String
    status: String!
    requested_at: String
    reviewed_at: String
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

  input CreateCycleInput {
    payout_amount: Float!
    start_date: String!
    positions: [CyclePositionInput!]!
  }

  input CyclePositionInput {
    member_id: ID!
    position_number: Int!
  }

  input RecordSavingsInput {
    member_id: ID!
    amount: Float!
    transaction_type: String!
    notes: String
  }

  input WithdrawalInput {
    amount: Float!
    reason: String
  }
`;

module.exports = typeDefs;