require('dotenv').config();

const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { ApolloServerPluginLandingPageLocalDefault } = require('apollo-server-core');

const sequelize = require('./src/config/database');
const typeDefs = require('./src/graphql/typeDefs');
const resolvers = require('./src/graphql/resolvers');
const { getAuthUser } = require('./src/middleware/authMiddleware');
const mpesaRoutes = require('./src/modules/mpesa/mpesa.routes');

async function startServer() {
  const app = express();

  app.use('/api/mpesa', express.json(), mpesaRoutes);

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    csrfPrevention: true,
    plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
    context: ({ req }) => {
      const user = getAuthUser(req);
      return { req, user };
    }
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const reportsRoutes = require('./src/modules/reports/reports.routes');
  app.use('/api/reports', reportsRoutes);
  
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to database:', error.message);
    process.exit(1);
  }

  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/graphql`);
  });
}

startServer();