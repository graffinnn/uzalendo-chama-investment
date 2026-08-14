import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_PORTFOLIO = gql`
  query GetPortfolio {
    getPortfolio {
      total_invested
      total_current_value
      total_profit_loss
      count
      investments {
        id
        name
        investment_type
        amount_invested
        current_value
        profit_loss
        profit_loss_percentage
        investment_date
      }
    }
  }
`;

const ADD_INVESTMENT = gql`
  mutation AddInvestment($input: AddInvestmentInput!) {
    addInvestment(input: $input) {
      id
      name
    }
  }
`;

const UPDATE_INVESTMENT_VALUE = gql`
  mutation UpdateInvestmentValue($investmentId: ID!, $newValue: Float!) {
    updateInvestmentValue(investmentId: $investmentId, newValue: $newValue) {
      id
      current_value
    }
  }
`;

const INVESTMENT_TYPES = ['SHARES', 'LAND', 'BUSINESS', 'BONDS', 'OTHER'];

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

export default function ManageInvestmentsScreen() {
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('BONDS');
  const [amountInvested, setAmountInvested] = useState('');
  const [notes, setNotes] = useState('');
  const [newValue, setNewValue] = useState('');

  const { data, loading, error, refetch } = useQuery(GET_PORTFOLIO, {
    fetchPolicy: 'network-only'
  });

  const [addInvestment, { loading: adding }] = useMutation(ADD_INVESTMENT, {
    onCompleted: () => {
      Alert.alert('Success', 'Investment added to portfolio.');
      setAddModalVisible(false);
      setName('');
      setAmountInvested('');
      setNotes('');
      refetch();
    },
    onError: (err) => Alert.alert('Error', err.message)
  });

  const [updateValue, { loading: updating }] = useMutation(UPDATE_INVESTMENT_VALUE, {
    onCompleted: () => {
      Alert.alert('Updated', 'Investment value updated.');
      setUpdateModalVisible(false);
      setNewValue('');
      setSelectedInvestment(null);
      refetch();
    },
    onError: (err) => Alert.alert('Error', err.message)
  });

  const handleAdd = () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter an investment name.');
      return;
    }
    if (!amountInvested || isNaN(Number(amountInvested)) || Number(amountInvested) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount invested.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    addInvestment({
      variables: {
        input: {
          name: name.trim(),
          investment_type: type,
          amount_invested: Number(amountInvested),
          investment_date: today,
          notes: notes.trim() || undefined
        }
      }
    });
  };

  const openUpdateModal = (investment) => {
    setSelectedInvestment(investment);
    setNewValue(String(investment.current_value));
    setUpdateModalVisible(true);
  };

  const handleUpdate = () => {
    if (!newValue || isNaN(Number(newValue)) || Number(newValue) < 0) {
      Alert.alert('Invalid value', 'Please enter a valid current value.');
      return;
    }

    updateValue({
      variables: {
        investmentId: selectedInvestment.id,
        newValue: Number(newValue)
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
          <Text style={styles.errorText}>Failed to load portfolio</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const portfolio = data.getPortfolio;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Investment Portfolio</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Invested</Text>
              <Text style={styles.summaryValue}>{formatKES(portfolio.total_invested)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Current Value</Text>
              <Text style={styles.summaryValue}>{formatKES(portfolio.total_current_value)}</Text>
            </View>
          </View>
          <View style={styles.profitBar}>
            <Text style={[
              styles.profitText,
              { color: portfolio.total_profit_loss >= 0 ? '#A5D6A7' : '#EF9A9A' }
            ]}>
              {portfolio.total_profit_loss >= 0 ? '+' : ''}{formatKES(portfolio.total_profit_loss)} overall
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Holdings ({portfolio.count})</Text>

        {portfolio.investments.length === 0 ? (
          <Text style={styles.emptyText}>No investments recorded yet</Text>
        ) : (
          portfolio.investments.map((inv) => (
            <TouchableOpacity
              key={inv.id}
              style={styles.card}
              onPress={() => openUpdateModal(inv)}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.investName}>{inv.name}</Text>
                  <Text style={styles.investType}>{inv.investment_type}</Text>
                </View>
                <Text style={[
                  styles.profitLossText,
                  { color: inv.profit_loss >= 0 ? '#2E7D32' : '#C62828' }
                ]}>
                  {inv.profit_loss >= 0 ? '+' : ''}{inv.profit_loss_percentage}%
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Invested</Text>
                <Text style={styles.statValue}>{formatKES(inv.amount_invested)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Current value</Text>
                <Text style={styles.statValue}>{formatKES(inv.current_value)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Date</Text>
                <Text style={styles.statValue}>{formatDate(inv.investment_date)}</Text>
              </View>
              <Text style={styles.tapHint}>Tap to update current value</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={addModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Investment</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Treasury Bills"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeGrid}>
              {INVESTMENT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, type === t && styles.typeChipSelected]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.typeChipText, type === t && styles.typeChipTextSelected]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Amount Invested (KES)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50000"
              placeholderTextColor="#999"
              value={amountInvested}
              onChangeText={setAmountInvested}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 91-day T-bill, 11% annualized"
              placeholderTextColor="#999"
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAddModalVisible(false)}
                disabled={adding}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAdd}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={updateModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Value</Text>
            <Text style={styles.modalSubtitle}>{selectedInvestment?.name}</Text>

            <Text style={styles.label}>Current Value (KES)</Text>
            <TextInput
              style={styles.input}
              value={newValue}
              onChangeText={setNewValue}
              keyboardType="numeric"
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setUpdateModalVisible(false)}
                disabled={updating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleUpdate}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Update</Text>
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
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1B5E20' },
  addButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  summaryCard: {
    backgroundColor: '#1B5E20',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { flex: 1 },
  summaryLabel: { fontSize: 12, color: '#C8E6C9' },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 4 },
  profitBar: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)'
  },
  profitText: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  investName: { fontSize: 15, fontWeight: '700', color: '#222' },
  investType: { fontSize: 12, color: '#777', marginTop: 2 },
  profitLossText: { fontSize: 15, fontWeight: '800' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statLabel: { fontSize: 12, color: '#777' },
  statValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  tapHint: { fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
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
  modalSubtitle: { fontSize: 13, color: '#777', marginBottom: 12 },
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
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    backgroundColor: '#F5F7F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  typeChipSelected: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  typeChipText: { fontSize: 12, color: '#333' },
  typeChipTextSelected: { color: '#fff', fontWeight: '700' },
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