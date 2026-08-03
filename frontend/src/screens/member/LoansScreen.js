import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_MY_LOANS = gql`
  query GetMyLoans {
    getMyLoans {
      id
      amount
      reason
      repayment_period_months
      interest_rate
      status
      applied_at
    }
  }
`;

const APPLY_FOR_LOAN = gql`
  mutation ApplyForLoan($input: LoanInput!) {
    applyForLoan(input: $input) {
      id
      amount
      status
    }
  }
`;

const statusColors = {
  PENDING: '#F57C00',
  APPROVED: '#2E7D32',
  REJECTED: '#C62828',
  FULLY_PAID: '#1565C0'
};

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

export default function LoansScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [period, setPeriod] = useState('3');

  const { data, loading, error, refetch } = useQuery(GET_MY_LOANS, {
    fetchPolicy: 'network-only'
  });

  const [applyForLoan, { loading: applying }] = useMutation(APPLY_FOR_LOAN, {
    onCompleted: () => {
      Alert.alert('Success', 'Your loan application has been submitted.');
      setModalVisible(false);
      setAmount('');
      setReason('');
      setPeriod('3');
      refetch();
    },
    onError: (err) => Alert.alert('Application failed', err.message)
  });

  const handleApply = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid loan amount.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Missing reason', 'Please provide a reason for the loan.');
      return;
    }
    const periodNum = Number(period);
    if (!periodNum || periodNum <= 0) {
      Alert.alert('Invalid period', 'Please enter a valid repayment period in months.');
      return;
    }

    applyForLoan({
      variables: {
        input: {
          amount: Number(amount),
          reason: reason.trim(),
          repayment_period_months: periodNum
        }
      }
    });
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
          <Text style={styles.errorText}>Failed to load loans</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const loans = data.getMyLoans;
  const hasActiveLoan = loans.some((l) => l.status === 'PENDING' || l.status === 'APPROVED');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Loans</Text>
          <TouchableOpacity
            style={[styles.applyButton, hasActiveLoan && styles.applyButtonDisabled]}
            onPress={() => setModalVisible(true)}
            disabled={hasActiveLoan}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {hasActiveLoan && (
          <Text style={styles.noticeText}>
            You already have a pending or active loan. Apply again once it's fully paid.
          </Text>
        )}

        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} colors={['#2E7D32']} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.loanAmount}>{formatKES(item.amount)}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.loanReason}>{item.reason}</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Period</Text>
                <Text style={styles.statValue}>{item.repayment_period_months} months</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Interest rate</Text>
                <Text style={styles.statValue}>{item.interest_rate}% / month</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Applied</Text>
                <Text style={styles.statValue}>{formatDate(item.applied_at)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No loans applied for yet</Text>
          }
        />

        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Apply for Loan</Text>

              <Text style={styles.label}>Amount (KES)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 10000"
                placeholderTextColor="#999"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Medical emergency"
                placeholderTextColor="#999"
                value={reason}
                onChangeText={setReason}
              />

              <Text style={styles.label}>Repayment period (months)</Text>
              <TextInput
                style={styles.input}
                value={period}
                onChangeText={setPeriod}
                keyboardType="numeric"
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                  disabled={applying}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleApply}
                  disabled={applying}
                >
                  {applying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7F5' },
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1B5E20' },
  applyButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8
  },
  applyButtonDisabled: { backgroundColor: '#BDBDBD' },
  applyButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  noticeText: {
    fontSize: 12,
    color: '#F57C00',
    paddingHorizontal: 16,
    marginBottom: 8,
    fontStyle: 'italic'
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
    alignItems: 'center',
    marginBottom: 6
  },
  loanAmount: { fontSize: 18, fontWeight: '700', color: '#1B5E20' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  loanReason: { fontSize: 13, color: '#555', marginBottom: 10 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  statLabel: { fontSize: 13, color: '#777' },
  statValue: { fontSize: 13, fontWeight: '600', color: '#333' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontStyle: 'italic' },
  errorText: { fontSize: 16, fontWeight: '700', color: '#C62828', marginBottom: 8 },
  errorDetail: { fontSize: 13, color: '#777', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1B5E20', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#F5F7F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  modalButtonRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F0F0F0'
  },
  cancelButtonText: { color: '#555', fontWeight: '600' },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#2E7D32'
  },
  submitButtonText: { color: '#fff', fontWeight: '700' }
});