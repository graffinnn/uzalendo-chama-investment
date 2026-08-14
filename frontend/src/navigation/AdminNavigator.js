import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageMembersScreen from '../screens/admin/ManageMembersScreen';
import RecordContributionScreen from '../screens/admin/RecordContributionScreen';
import ManageLoansScreen from '../screens/admin/ManageLoansScreen';
import ManageSavingsScreen from '../screens/admin/ManageSavingsScreen';
import ManageCyclesScreen from '../screens/admin/ManageCyclesScreen';
import ManageInvestmentsScreen from '../screens/admin/ManageInvestmentsScreen';

const Tab = createBottomTabNavigator();

export default function AdminNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Members" component={ManageMembersScreen} />
      <Tab.Screen name="Record" component={RecordContributionScreen} />
      <Tab.Screen name="Loans" component={ManageLoansScreen} />
      <Tab.Screen name="Savings" component={ManageSavingsScreen} />
      <Tab.Screen name="Cycles" component={ManageCyclesScreen} />
      <Tab.Screen name="Invest" component={ManageInvestmentsScreen} />
    </Tab.Navigator>
  );
}