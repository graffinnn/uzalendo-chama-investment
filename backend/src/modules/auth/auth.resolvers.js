const { registerAdmin, loginAdmin, registerMember, loginMember } = require('./auth.service');

const authResolvers = {
  Mutation: {
    registerAdmin: async (_, { input }) => {
      return registerAdmin(input);
    },
    loginAdmin: async (_, { email, password }) => {
      return loginAdmin(email, password);
    },
    registerMember: async (_, { input }) => {
      return registerMember(input);
    },
    loginMember: async (_, { phone, password }) => {
      return loginMember(phone, password);
    }
  }
};

module.exports = authResolvers;