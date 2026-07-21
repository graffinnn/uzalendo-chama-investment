import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MemberDashboardScreen from '../screens/member/MemberDashboardScreen';
import ContributionsScreen from '../screens/member/ContributionsScreen';
import ScoreScreen from '../screens/member/ScoreScreen';

const Tab = createBottomTabNavigator();

export default function MemberNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Dashboard" component={MemberDashboardScreen} />
      <Tab.Screen name="Contributions" component={ContributionsScreen} />
      <Tab.Screen name="Score" component={ScoreScreen} />
    </Tab.Navigator>
  );
}
