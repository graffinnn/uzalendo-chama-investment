const { getAdminDashboard } = require('./dashboard.service');

const dashboardResolvers = {
  Query: {
    getAdminDashboard: async (_, __, { user }) => {
      if (!user || user.role !== 'ADMIN') throw new Error('Admin access required.');
      return getAdminDashboard();
    }
  }
};

module.exports = dashboardResolvers;