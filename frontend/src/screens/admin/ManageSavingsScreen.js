import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_PENDING_WITHDRAWALS = gql`
  query GetPendingWithdrawals {
    getPendingWithdrawals {
      id
      amount
      reason
      status
      requested_at
      member_name
      member_number
    }
  }
`;

const APPROVE_WITHDRAWAL = gql`
  mutation ApproveWithdrawal($withdrawalId: ID!) {
    approveWithdrawal(withdrawalId: $withdrawalId) {
      id
      status
    }
  }
`;

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

export default function ManageSavingsScreen() {
  const { data, loading, error, refetch } = useQuery(GET_PENDING_WITHDRAWALS, {
    fetchPolicy: 'network-only'
  });

  const [approveWithdrawal, { loading: approving }] = useMutation(APPROVE_WITHDRAWAL, {
    onCompleted: () => {
      Alert.alert('Approved', 'Withdrawal approved and recorded.');
      refetch();
    },
    onError: (err) => Alert.alert('Error', err.message)
  });

  const handleApprove = (withdrawal) => {
    Alert.alert(
      'Approve Withdrawal',
      `Approve ${formatKES(withdrawal.amount)} withdrawal for ${withdrawal.member_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveWithdrawal({ variables: { withdrawalId: withdrawal.id } }) }
      ]
    );
  };

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
          <Text style={styles.errorText}>Failed to load withdrawals</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const withdrawals = data.getPendingWithdrawals;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Pending Withdrawals ({withdrawals.length})</Text>

        <FlatList
          data={withdrawals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} colors={['#2E7D32']} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{item.member_name}</Text>
                  <Text style={styles.memberNumber}>{item.member_number}</Text>
                </View>
                <Text style={styles.amountText}>{formatKES(item.amount)}</Text>
              </View>

              {item.reason ? <Text style={styles.reasonText}>{item.reason}</Text> : null}

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Requested</Text>
                <Text style={styles.statValue}>{formatDate(item.requested_at)}</Text>
              </View>

              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => handleApprove(item)}
                disabled={approving}
              >
                {approving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.approveButtonText}>Approve Withdrawal</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No pending withdrawal requests</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E20',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  list: { padding: 16, paddingTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  memberName: { fontSize: 15, fontWeight: '700', color: '#222' },
  memberNumber: { fontSize: 12, color: '#777', marginTop: 2 },
  amountText: { fontSize: 18, fontWeight: '800', color: '#F57C00' },
  reasonText: { fontSize: 13, color: '#555', marginBottom: 8 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 12
  },
  statLabel: { fontSize: 12, color: '#777' },
  statValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  approveButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  approveButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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