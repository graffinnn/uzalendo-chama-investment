import React, { useState } from 'react';
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
import { gql, useQuery, useMutation, useLazyQuery } from '@apollo/client';

const GET_ALL_LOANS = gql`
  query GetAllLoans {
    getAllLoans {
      id
      amount
      reason
      repayment_period_months
      interest_rate
      status
      applied_at
      member_name
      member_number
    }
  }
`;

const GET_LOAN_DETAIL = gql`
  query GetLoanDetail($loanId: ID!) {
    getLoan(loanId: $loanId) {
      id
      amount
      status
      repayment_schedule {
        id
        amount
        due_date
        paid_date
        status
      }
    }
  }
`;

const APPROVE_LOAN = gql`
  mutation ApproveLoan($loanId: ID!) {
    approveLoan(loanId: $loanId) {
      id
      status
    }
  }
`;

const REJECT_LOAN = gql`
  mutation RejectLoan($loanId: ID!) {
    rejectLoan(loanId: $loanId) {
      id
      status
    }
  }
`;

const RECORD_REPAYMENT = gql`
  mutation RecordRepayment($repaymentId: ID!) {
    recordRepayment(repaymentId: $repaymentId) {
      id
      status
      paid_date
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

export default function ManageLoansScreen() {
  const [expandedLoanId, setExpandedLoanId] = useState(null);

  const { data, loading, error, refetch } = useQuery(GET_ALL_LOANS, {
    fetchPolicy: 'network-only'
  });

  const [fetchLoanDetail, { data: detailData, loading: detailLoading }] = useLazyQuery(
    GET_LOAN_DETAIL,
    { fetchPolicy: 'network-only' }
  );

  const [approveLoan, { loading: approving }] = useMutation(APPROVE_LOAN, {
    onCompleted: () => {
      Alert.alert('Approved', 'Loan approved and repayment schedule generated.');
      refetch();
    },
    onError: (err) => Alert.alert('Error', err.message)
  });

  const [rejectLoan, { loading: rejecting }] = useMutation(REJECT_LOAN, {
    onCompleted: () => {
      Alert.alert('Rejected', 'Loan application rejected.');
      refetch();
    },
    onError: (err) => Alert.alert('Error', err.message)
  });

  const [recordRepayment, { loading: recordingRepayment }] = useMutation(RECORD_REPAYMENT, {
    onCompleted: () => {
      Alert.alert('Recorded', 'Repayment marked as paid.');
      refetch();
      if (expandedLoanId) fetchLoanDetail({ variables: { loanId: expandedLoanId } });
    },
    onError: (err) => Alert.alert('Error', err.message)
  });

  const handleApprove = (loan) => {
    Alert.alert(
      'Approve Loan',
      `Approve ${formatKES(loan.amount)} for ${loan.member_name}? This will generate a repayment schedule.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveLoan({ variables: { loanId: loan.id } }) }
      ]
    );
  };

  const handleReject = (loan) => {
    Alert.alert(
      'Reject Loan',
      `Reject ${loan.member_name}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => rejectLoan({ variables: { loanId: loan.id } }) }
      ]
    );
  };

  const handleToggleExpand = (loan) => {
    if (expandedLoanId === loan.id) {
      setExpandedLoanId(null);
    } else {
      setExpandedLoanId(loan.id);
      fetchLoanDetail({ variables: { loanId: loan.id } });
    }
  };

  const handleRecordRepayment = (repaymentId) => {
    Alert.alert(
      'Record Repayment',
      'Mark this installment as paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Paid', onPress: () => recordRepayment({ variables: { repaymentId } }) }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load loans</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const loans = data.getAllLoans;
  const busy = approving || rejecting || recordingRepayment;

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Loans ({loans.length})</Text>

      <FlatList
        data={loans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} colors={['#2E7D32']} />
        }
        renderItem={({ item }) => {
          const isExpanded = expandedLoanId === item.id;
          return (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => handleToggleExpand(item)}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{item.member_name}</Text>
                    <Text style={styles.memberNumber}>{item.member_number}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                      {item.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.loanAmount}>{formatKES(item.amount)}</Text>
                <Text style={styles.loanReason}>{item.reason}</Text>

                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Period</Text>
                  <Text style={styles.statValue}>{item.repayment_period_months} months @ {item.interest_rate}%</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Applied</Text>
                  <Text style={styles.statValue}>{formatDate(item.applied_at)}</Text>
                </View>
              </TouchableOpacity>

              {item.status === 'PENDING' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(item)}
                    disabled={busy}
                  >
                    <Text style={styles.approveButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(item)}
                    disabled={busy}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isExpanded && (
                <View style={styles.scheduleSection}>
                  <Text style={styles.scheduleTitle}>Repayment Schedule</Text>
                  {detailLoading ? (
                    <ActivityIndicator color="#2E7D32" style={{ marginTop: 8 }} />
                  ) : detailData?.getLoan?.repayment_schedule?.length > 0 ? (
                    detailData.getLoan.repayment_schedule.map((r) => (
                      <View key={r.id} style={styles.repaymentRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.repaymentAmount}>{formatKES(r.amount)}</Text>
                          <Text style={styles.repaymentDue}>Due {formatDate(r.due_date)}</Text>
                        </View>
                        {r.status === 'PAID' ? (
                          <Text style={styles.paidLabel}>PAID {formatDate(r.paid_date)}</Text>
                        ) : (
                          <TouchableOpacity
                            style={[
                              styles.markPaidButton,
                              r.status === 'OVERDUE' && styles.markPaidButtonOverdue
                            ]}
                            onPress={() => handleRecordRepayment(r.id)}
                            disabled={busy}
                          >
                            <Text style={styles.markPaidButtonText}>
                              {r.status === 'OVERDUE' ? 'Overdue - Mark Paid' : 'Mark Paid'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No repayment schedule yet</Text>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No loan applications yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  memberName: { fontSize: 15, fontWeight: '700', color: '#222' },
  memberNumber: { fontSize: 12, color: '#777', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  loanAmount: { fontSize: 20, fontWeight: '800', color: '#1B5E20', marginBottom: 4 },
  loanReason: { fontSize: 13, color: '#555', marginBottom: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statLabel: { fontSize: 12, color: '#777' },
  statValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approveButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  approveButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectButton: {
    flex: 1,
    backgroundColor: '#FEEBEE',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  rejectButtonText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
  scheduleSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  scheduleTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 8 },
  repaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  repaymentAmount: { fontSize: 13, fontWeight: '700', color: '#222' },
  repaymentDue: { fontSize: 11, color: '#999', marginTop: 2 },
  paidLabel: { fontSize: 11, fontWeight: '700', color: '#2E7D32' },
  markPaidButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  markPaidButtonOverdue: { backgroundColor: '#C62828' },
  markPaidButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontStyle: 'italic' },
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