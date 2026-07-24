import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_ACTIVE_MEMBERS = gql`
  query GetActiveMembers {
    getMembers {
      id
      full_name
      member_number
      status
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
      member_name
    }
  }
`;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const now = new Date();

export default function RecordContributionScreen() {
  const [selectedMember, setSelectedMember] = useState(null);
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, loading: loadingMembers, error: membersError } = useQuery(GET_ACTIVE_MEMBERS, {
    fetchPolicy: 'network-only'
  });

  const [recordContribution, { loading: submitting }] = useMutation(RECORD_CONTRIBUTION, {
    onCompleted: (result) => {
      Alert.alert(
        'Success',
        `KES ${result.recordContribution.amount} recorded for ${result.recordContribution.member_name}`
      );
      setAmount('');
      setSelectedMember(null);
    },
    onError: (err) => Alert.alert('Error', err.message)
  });

  const handleSubmit = () => {
    if (!selectedMember) {
      Alert.alert('Missing member', 'Please select a member.');
      return;
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid contribution amount.');
      return;
    }

    recordContribution({
      variables: {
        input: {
          member_id: selectedMember.id,
          amount: Number(amount),
          contribution_month: month,
          contribution_year: year
        }
      }
    });
  };

  if (loadingMembers) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (membersError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load members</Text>
        <Text style={styles.errorDetail}>{membersError.message}</Text>
      </View>
    );
  }

  const activeMembers = data.getMembers.filter((m) => m.status === 'ACTIVE');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Record Contribution</Text>

      <Text style={styles.label}>Select Member</Text>
      {activeMembers.length === 0 ? (
        <Text style={styles.emptyText}>No active members available</Text>
      ) : (
        <View style={styles.memberList}>
          {activeMembers.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.memberChip,
                selectedMember?.id === m.id && styles.memberChipSelected
              ]}
              onPress={() => setSelectedMember(m)}
            >
              <Text
                style={[
                  styles.memberChipText,
                  selectedMember?.id === m.id && styles.memberChipTextSelected
                ]}
              >
                {m.full_name} · {m.member_number}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
        {MONTHS.map((label, index) => (
          <TouchableOpacity
            key={label}
            style={[
              styles.monthChip,
              month === index + 1 && styles.monthChipSelected
            ]}
            onPress={() => setMonth(index + 1)}
          >
            <Text
              style={[
                styles.monthChipText,
                month === index + 1 && styles.monthChipTextSelected
              ]}
            >
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

      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Record Contribution</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', color: '#1B5E20', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 16 },
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
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  monthChip: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  monthChipSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32'
  },
  monthChipText: { fontSize: 13, color: '#333' },
  monthChipTextSelected: { color: '#fff', fontWeight: '700' },
  submitButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#999', fontStyle: 'italic', marginBottom: 8 },
  errorText: { fontSize: 16, fontWeight: '700', color: '#C62828', marginBottom: 8 },
  errorDetail: { fontSize: 13, color: '#777', textAlign: 'center' }
});