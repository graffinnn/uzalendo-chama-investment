import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql, useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';
import ReportButton from '../../components/ReportButton';

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

const RECORD_CONTRIBUTION = gql`
  mutation RecordContribution($input: RecordContributionInput!) {
    recordContribution(input: $input) {
      id
      amount
      contribution_month
      contribution_year
    }
  }
`;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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

const now = new Date();

export default function ContributionsScreen() {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [downloadingStatement, setDownloadingStatement] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_MY_CONTRIBUTIONS, {
    variables: { memberId: user?.id },
    fetchPolicy: 'network-only',
    skip: !user?.id
  });

  const [recordContribution, { loading: submitting }] = useMutation(RECORD_CONTRIBUTION, {
    onCompleted: () => {
      Alert.alert('Success', 'Your contribution has been recorded.');
      setModalVisible(false);
      setAmount('');
      refetch();
    },
    onError: (err) => Alert.alert('Contribution failed', err.message)
  });

  const handleSubmit = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid contribution amount.');
      return;
    }

    recordContribution({
      variables: {
        input: {
          member_id: user.id,
          amount: Number(amount),
          contribution_month: month,
          contribution_year: year
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
          <TouchableOpacity style={styles.makeButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.makeButtonText}>Make Contribution</Text>
          </TouchableOpacity>
          <ReportButton
            reportPath="contribution-history"
            filename="contribution-history.pdf"
            label="Download Contribution History"
          />
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

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Make Contribution</Text>

            <Text style={styles.label}>Amount (KES)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2000"
              placeholderTextColor="#999"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Month</Text>
            <View style={styles.monthGrid}>
              {MONTHS_SHORT.map((label, index) => (
                <TouchableOpacity
                  key={label}
                  style={[styles.monthChip, month === index + 1 && styles.monthChipSelected]}
                  onPress={() => setMonth(index + 1)}
                >
                  <Text style={[styles.monthChipText, month === index + 1 && styles.monthChipTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Year</Text>
            <TextInput
              style={styles.input}
              value={String(year)}
              onChangeText={(text) => setYear(Number(text) || year)}
              keyboardType="numeric"
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
                onPress={handleSubmit}
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
  makeButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16
  },
  makeButtonText: { color: '#1B5E20', fontWeight: '700', fontSize: 13 },
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
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  monthChip: {
    backgroundColor: '#F5F7F5',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  monthChipSelected: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  monthChipText: { fontSize: 12, color: '#333' },
  monthChipTextSelected: { color: '#fff', fontWeight: '700' },
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