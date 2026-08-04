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

const GET_MY_SAVINGS_DATA = gql`
  query GetMySavingsData {
    getMySavingsBalance
    getMySavingsHistory {
      id
      amount
      transaction_type
      notes
      recorded_at
    }
  }
`;

const REQUEST_WITHDRAWAL = gql`
  mutation RequestWithdrawal($input: WithdrawalInput!) {
    requestWithdrawal(input: $input) {
      id
      amount
      status
      reason
    }
  }
`;

const typeColors = {
  DEPOSIT: '#2E7D32',
  WITHDRAWAL: '#C62828',
  INTEREST: '#1565C0',
  PROFIT_SHARE: '#6A1B9A'
};

const typeLabels = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  INTEREST: 'Interest',
  PROFIT_SHARE: 'Profit Share'
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

export default function SavingsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_MY_SAVINGS_DATA, {
    fetchPolicy: 'network-only'
  });

  const [requestWithdrawal, { loading: submitting }] = useMutation(REQUEST_WITHDRAWAL, {
    onCompleted: () => {
      Alert.alert('Success', 'Your withdrawal request has been submitted for approval.');
      setModalVisible(false);
      setAmount('');
      setReason('');
      refetch();
    },
    onError: (err) => Alert.alert('Request failed', err.message)
  });

  const handleRequest = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }

    requestWithdrawal({
      variables: {
        input: {
          amount: Number(amount),
          reason: reason.trim() || undefined
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
          <Text style={styles.errorText}>Failed to load savings</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const balance = data.getMySavingsBalance;
  const history = data.getMySavingsHistory;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        style={styles.container}
        data={history}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} colors={['#2E7D32']} />
        }
        ListHeaderComponent={
          <View>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Savings Balance</Text>
              <Text style={styles.balanceValue}>{formatKES(balance)}</Text>
              <TouchableOpacity
                style={styles.withdrawButton}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.withdrawButtonText}>Request Withdrawal</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionTitle}>Transaction History</Text>
          </View>
        }
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.typeText, { color: typeColors[item.transaction_type] }]}>
                {typeLabels[item.transaction_type] || item.transaction_type}
              </Text>
              {item.notes ? <Text style={styles.notesText}>{item.notes}</Text> : null}
              <Text style={styles.dateText}>{formatDate(item.recorded_at)}</Text>
            </View>
            <Text style={[
              styles.amountText,
              { color: item.transaction_type === 'WITHDRAWAL' ? '#C62828' : '#2E7D32' }
            ]}>
              {item.transaction_type === 'WITHDRAWAL' ? '-' : '+'}{formatKES(item.amount)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No savings activity yet</Text>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request Withdrawal</Text>
            <Text style={styles.modalSubtitle}>Available balance: {formatKES(balance)}</Text>

            <Text style={styles.label}>Amount (KES)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1000"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Reason (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. School fees"
              placeholderTextColor="#999"
              value={reason}
              onChangeText={setReason}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7F5' },
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 40 },
  balanceCard: {
    backgroundColor: '#1B5E20',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center'
  },
  balanceLabel: { fontSize: 13, color: '#C8E6C9' },
  balanceValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4, marginBottom: 16 },
  withdrawButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10
  },
  withdrawButtonText: { color: '#1B5E20', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  typeText: { fontSize: 14, fontWeight: '700' },
  notesText: { fontSize: 12, color: '#666', marginTop: 2 },
  dateText: { fontSize: 11, color: '#999', marginTop: 2 },
  amountText: { fontSize: 15, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontStyle: 'italic' },
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
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1B5E20', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#777', marginBottom: 16 },
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