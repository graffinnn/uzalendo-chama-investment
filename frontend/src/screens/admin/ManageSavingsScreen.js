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

const GET_ACTIVE_MEMBERS_FOR_SAVINGS = gql`
  query GetActiveMembersForSavings {
    getMembers {
      id
      full_name
      member_number
      status
    }
  }
`;

const RECORD_SAVINGS = gql`
  mutation RecordSavings($input: RecordSavingsInput!) {
    recordSavings(input: $input) {
      id
      amount
      transaction_type
      member_name
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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_PENDING_WITHDRAWALS, {
    fetchPolicy: 'network-only'
  });

  const { data: membersData } = useQuery(GET_ACTIVE_MEMBERS_FOR_SAVINGS, {
    fetchPolicy: 'network-only'
  });

  const [approveWithdrawal, { loading: approving }] = useMutation(APPROVE_WITHDRAWAL, {
    onCompleted: () => {
      Alert.alert('Approved', 'Withdrawal approved and recorded.');
      refetch();
    },
    onError: (err) => Alert.alert('Error', err.message)
  });

  const [recordSavings, { loading: recording }] = useMutation(RECORD_SAVINGS, {
    onCompleted: (result) => {
      Alert.alert(
        'Success',
        `KES ${result.recordSavings.amount} deposit recorded for ${result.recordSavings.member_name}`
      );
      setModalVisible(false);
      setDepositAmount('');
      setDepositNotes('');
      setSelectedMember(null);
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

  const handleRecordDeposit = () => {
    if (!selectedMember) {
      Alert.alert('Missing member', 'Please select a member.');
      return;
    }
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid deposit amount.');
      return;
    }

    recordSavings({
      variables: {
        input: {
          member_id: selectedMember.id,
          amount: Number(depositAmount),
          transaction_type: 'DEPOSIT',
          notes: depositNotes.trim() || undefined
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
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Savings</Text>
          <TouchableOpacity style={styles.recordButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.recordButtonText}>+ Record Deposit</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subHeaderTitle}>Pending Withdrawals ({withdrawals.length})</Text>

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

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Savings Deposit</Text>

            <Text style={styles.label}>Select Member</Text>
            {membersData ? (
              <View style={styles.memberList}>
                {membersData.getMembers.filter((m) => m.status === 'ACTIVE').map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      styles.memberChip,
                      selectedMember?.id === m.id && styles.memberChipSelected
                    ]}
                    onPress={() => setSelectedMember(m)}
                  >
                    <Text style={[
                      styles.memberChipText,
                      selectedMember?.id === m.id && styles.memberChipTextSelected
                    ]}>
                      {m.full_name} · {m.member_number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <ActivityIndicator color="#2E7D32" />
            )}

            <Text style={styles.label}>Amount (KES)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5000"
              placeholderTextColor="#999"
              value={depositAmount}
              onChangeText={setDepositAmount}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Voluntary savings deposit"
              placeholderTextColor="#999"
              value={depositNotes}
              onChangeText={setDepositNotes}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={recording}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleRecordDeposit}
                disabled={recording}
              >
                {recording ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Record</Text>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1B5E20' },
  recordButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  recordButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  subHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#555',
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
    padding: 20,
    maxHeight: '85%'
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
  memberList: { gap: 8, maxHeight: 200 },
  memberChip: {
    backgroundColor: '#F5F7F5',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 6
  },
  memberChipSelected: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
  memberChipText: { fontSize: 13, color: '#333' },
  memberChipTextSelected: { color: '#1B5E20', fontWeight: '700' },
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