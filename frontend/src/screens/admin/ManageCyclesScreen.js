import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_CYCLE_DATA = gql`
  query GetCycleData {
    getCurrentCycle {
      id
      payout_amount
      start_date
      status
      positions {
        position_number
        member_name
        expected_payout_date
        status
      }
    }
    getCycleHistory {
      id
      payout_amount
      start_date
      status
      positions {
        position_number
        member_name
        expected_payout_date
        status
      }
    }
    getMembers {
      id
      full_name
      member_number
      status
    }
  }
`;

const CREATE_CYCLE = gql`
  mutation CreateCycle($input: CreateCycleInput!) {
    createCycle(input: $input) {
      id
      status
    }
  }
`;

const COMPLETE_CYCLE = gql`
  mutation CompleteCycle($cycleId: ID!) {
    completeCycle(cycleId: $cycleId) {
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

export default function ManageCyclesScreen() {
  const [payoutAmount, setPayoutAmount] = useState('');
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_CYCLE_DATA, {
    fetchPolicy: 'network-only'
  });

  const [createCycle, { loading: creating }] = useMutation(CREATE_CYCLE, {
    onCompleted: () => {
      Alert.alert('Success', 'New cycle created with member positions assigned.');
      setPayoutAmount('');
      setSelectedOrder([]);
      refetch();
    },
    onError: (err) => Alert.alert('Error', err.message)
  });

  const [completeCycle, { loading: completing }] = useMutation(COMPLETE_CYCLE, {
    onCompleted: () => {
      Alert.alert('Cycle Completed', 'You can now create a new cycle.');
      refetch();
    },
    onError: (err) => Alert.alert('Error', err.message)
  });

  const toggleMember = (member) => {
    setSelectedOrder((prev) => {
      const exists = prev.find((m) => m.id === member.id);
      if (exists) {
        return prev.filter((m) => m.id !== member.id);
      }
      return [...prev, member];
    });
  };

  const handleCreateCycle = () => {
    if (!payoutAmount || isNaN(Number(payoutAmount)) || Number(payoutAmount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid payout amount.');
      return;
    }
    if (selectedOrder.length === 0) {
      Alert.alert('No members selected', 'Select at least one member, in payout order.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const positions = selectedOrder.map((member, index) => ({
      member_id: member.id,
      position_number: index + 1
    }));

    createCycle({
      variables: {
        input: {
          payout_amount: Number(payoutAmount),
          start_date: today,
          positions
        }
      }
    });
  };

  const handleCompleteCycle = (cycleId) => {
    Alert.alert(
      'Complete Cycle',
      'Mark this cycle as completed? You will be able to create a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => completeCycle({ variables: { cycleId } }) }
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
          <Text style={styles.errorText}>Failed to load cycle data</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentCycle = data.getCurrentCycle;
  const activeMembers = data.getMembers.filter((m) => m.status === 'ACTIVE');
  const pastCycles = (data.getCycleHistory || []).filter((c) => c.status === 'COMPLETED');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Merry-Go-Round Cycle</Text>

        {currentCycle ? (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Current Cycle</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{currentCycle.status}</Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Payout amount</Text>
              <Text style={styles.statValue}>{formatKES(currentCycle.payout_amount)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Start date</Text>
              <Text style={styles.statValue}>{formatDate(currentCycle.start_date)}</Text>
            </View>

            <Text style={styles.positionsTitle}>Payout Order</Text>
            {currentCycle.positions.map((p) => (
              <View key={p.position_number} style={styles.positionRow}>
                <Text style={styles.positionNumber}>#{p.position_number}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.positionName}>{p.member_name}</Text>
                  <Text style={styles.positionDate}>{formatDate(p.expected_payout_date)}</Text>
                </View>
                <Text style={[
                  styles.positionStatus,
                  p.status === 'PAID' && styles.positionStatusPaid
                ]}>
                  {p.status}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => handleCompleteCycle(currentCycle.id)}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.completeButtonText}>Mark Cycle Completed</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No active cycle. Create one below.</Text>
          </View>
        )}

        {!currentCycle && (
          <>
            <Text style={styles.sectionTitle}>Create New Cycle</Text>

            <Text style={styles.label}>Payout Amount (KES)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15000"
              placeholderTextColor="#999"
              value={payoutAmount}
              onChangeText={setPayoutAmount}
              keyboardType="numeric"
            />

            <Text style={styles.label}>
              Select Members (tap in payout order)
            </Text>
            {activeMembers.length === 0 ? (
              <Text style={styles.emptyText}>No active members available</Text>
            ) : (
              <View style={styles.memberList}>
                {activeMembers.map((m) => {
                  const orderIndex = selectedOrder.findIndex((s) => s.id === m.id);
                  const isSelected = orderIndex !== -1;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.memberChip, isSelected && styles.memberChipSelected]}
                      onPress={() => toggleMember(m)}
                    >
                      <Text style={[styles.memberChipText, isSelected && styles.memberChipTextSelected]}>
                        {isSelected ? `${orderIndex + 1}. ` : ''}{m.full_name} · {m.member_number}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateCycle}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Cycle</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {pastCycles.length > 0 && (
          <View style={styles.historySection}>
            <TouchableOpacity
              style={styles.historyToggle}
              onPress={() => setHistoryExpanded(!historyExpanded)}
            >
              <Text style={styles.historyToggleText}>
                Past Cycles ({pastCycles.length})
              </Text>
              <Text style={styles.historyToggleIcon}>{historyExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {historyExpanded && pastCycles.map((cycle) => (
              <View key={cycle.id} style={styles.historyCard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Payout amount</Text>
                  <Text style={styles.statValue}>{formatKES(cycle.payout_amount)}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Started</Text>
                  <Text style={styles.statValue}>{formatDate(cycle.start_date)}</Text>
                </View>

                {cycle.positions.map((p) => (
                  <View key={p.position_number} style={styles.positionRow}>
                    <Text style={styles.positionNumber}>#{p.position_number}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.positionName}>{p.member_name}</Text>
                      <Text style={styles.positionDate}>{formatDate(p.expected_payout_date)}</Text>
                    </View>
                    <Text style={[
                      styles.positionStatus,
                      p.status === 'PAID' && styles.positionStatusPaid
                    ]}>
                      {p.status}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7F5' },
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#1B5E20', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusText: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  statLabel: { fontSize: 13, color: '#777' },
  statValue: { fontSize: 13, fontWeight: '600', color: '#333' },
  positionsTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 14, marginBottom: 8 },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  positionNumber: { fontSize: 14, fontWeight: '800', color: '#2E7D32', width: 28 },
  positionName: { fontSize: 13, fontWeight: '600', color: '#222' },
  positionDate: { fontSize: 11, color: '#999', marginTop: 1 },
  positionStatus: { fontSize: 11, fontWeight: '700', color: '#F57C00' },
  positionStatusPaid: { color: '#2E7D32' },
  completeButton: {
    backgroundColor: '#1565C0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16
  },
  completeButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 8
  },
  memberList: { gap: 8 },
  memberChip: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DDD',
    marginBottom: 8
  },
  memberChipSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32'
  },
  memberChipText: { fontSize: 14, color: '#333' },
  memberChipTextSelected: { color: '#1B5E20', fontWeight: '700' },
  submitButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#999', fontStyle: 'italic' },
  errorText: { fontSize: 16, fontWeight: '700', color: '#C62828', marginBottom: 8 },
  errorDetail: { fontSize: 13, color: '#777', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  historySection: { marginTop: 24 },
  historyToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  historyToggleText: { fontSize: 14, fontWeight: '700', color: '#333' },
  historyToggleIcon: { fontSize: 12, color: '#777' },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  }
});