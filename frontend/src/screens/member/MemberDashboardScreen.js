import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MemberDashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Member Dashboard - coming next</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, color: '#4B4B4B' }
});
