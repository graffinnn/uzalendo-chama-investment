import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageMembersScreen from '../screens/admin/ManageMembersScreen';
import RecordContributionScreen from '../screens/admin/RecordContributionScreen';
import ManageLoansScreen from '../screens/admin/ManageLoansScreen';

const Tab = createBottomTabNavigator();

export default function AdminNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Members" component={ManageMembersScreen} />
      <Tab.Screen name="Record" component={RecordContributionScreen} />
      <Tab.Screen name="Loans" component={ManageLoansScreen} />
    </Tab.Navigator>
  );
}