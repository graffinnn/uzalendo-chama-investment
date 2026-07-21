import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import MemberNavigator from './MemberNavigator';
import AdminNavigator from './AdminNavigator';

export default function AppNavigator() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : role === 'ADMIN' ? (
        <AdminNavigator />
      ) : (
        <MemberNavigator />
      )}
    </NavigationContainer>
  );
}
