import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';

const GET_MY_CONTRIBUTIONS = gql`
  query GetMyContributions($memberId: ID!) {
    getMemberContributions(memberId: $memberId) {
      id
      amount
      contribution_month
      contribution_year
      recorded_at
    }
  }
`;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const formatKES = (amount) => {
  const num = Number(amount) || 0;
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ContributionsScreen() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_MY_CONTRIBUTIONS, {
    variables: { memberId: user?.id },
    fetchPolicy: 'network-only',
    skip: !user?.id
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E7D32" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load contributions</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const contributions = data.getMemberContributions;
  const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Contributed</Text>
          <Text style={styles.summaryValue}>{formatKES(total)}</Text>
          <Text style={styles.summaryCount}>{contributions.length} contribution{contributions.length !== 1 ? 's' : ''}</Text>
        </View>

        <FlatList
          data={contributions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} colors={['#2E7D32']} />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View>
                <Text style={styles.monthText}>
                  {MONTH_NAMES[item.contribution_month - 1]} {item.contribution_year}
                </Text>
                <Text style={styles.dateText}>Recorded {formatDate(item.recorded_at)}</Text>
              </View>
              <Text style={styles.amountText}>{formatKES(item.amount)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No contributions recorded yet</Text>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7F5' },
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  summaryCard: {
    backgroundColor: '#1B5E20',
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center'
  },
  summaryLabel: { fontSize: 13, color: '#C8E6C9' },
  summaryValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4 },
  summaryCount: { fontSize: 12, color: '#C8E6C9', marginTop: 4 },
  list: { padding: 16, paddingTop: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  monthText: { fontSize: 15, fontWeight: '700', color: '#222' },
  dateText: { fontSize: 12, color: '#999', marginTop: 2 },
  amountText: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontStyle: 'italic' },
  errorText: { fontSize: 16, fontWeight: '700', color: '#C62828', marginBottom: 8 },
  errorDetail: { fontSize: 13, color: '#777', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  retryButtonText: { color: '#fff', fontWeight: '600' }
});