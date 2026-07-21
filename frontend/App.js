import React from 'react';
import { ApolloProvider } from '@apollo/client';
import client from './src/services/graphqlClient';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ApolloProvider>
  );
}