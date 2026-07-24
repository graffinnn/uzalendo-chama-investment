import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { gql, useQuery } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';

const GET_MEMBER_DASHBOARD_DATA = gql`
  query GetMemberDashboardData($memberId: ID!) {
    getMyScore {
      overall_score
      contribution_score
      loan_score
    }
    getMySavingsBalance
    getMyCyclePosition {
      position_number
      expected_payout_date
      status
      payout_amount
    }
    getMemberContributions(memberId: $memberId) {
      amount
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

export default function MemberDashboardScreen() {
  const { user, logout } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_MEMBER_DASHBOARD_DATA, {
    variables: { memberId: user?.id },
    fetchPolicy: 'network-only',
    skip: !user?.id
  });

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
        <Text style={styles.errorText}>Failed to load dashboard</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalContributions = data.getMemberContributions.reduce(
    (sum, c) => sum + Number(c.amount),
    0
  );

  const cyclePosition = data.getMyCyclePosition;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} colors={['#2E7D32']} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.memberName}>{user?.full_name}</Text>
          <Text style={styles.memberNumber}>{user?.member_number}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Your Reliability Score</Text>
        <Text style={styles.scoreValue}>{Math.round(data.getMyScore.overall_score)}</Text>
        <View style={styles.scoreBreakdownRow}>
          <View style={styles.scoreBreakdownItem}>
            <Text style={styles.scoreBreakdownLabel}>Contribution</Text>
            <Text style={styles.scoreBreakdownValue}>{Math.round(data.getMyScore.contribution_score)}</Text>
          </View>
          <View style={styles.scoreBreakdownItem}>
            <Text style={styles.scoreBreakdownLabel}>Loan</Text>
            <Text style={styles.scoreBreakdownValue}>{Math.round(data.getMyScore.loan_score)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={[styles.card, styles.cardHalf]}>
          <Text style={styles.cardLabel}>Total Contributions</Text>
          <Text style={styles.cardValue}>{formatKES(totalContributions)}</Text>
        </View>
        <View style={[styles.card, styles.cardHalf]}>
          <Text style={styles.cardLabel}>Savings Balance</Text>
          <Text style={styles.cardValue}>{formatKES(data.getMySavingsBalance)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Merry-Go-Round</Text>
      <View style={styles.card}>
        {cyclePosition ? (
          <>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Your position</Text>
              <Text style={styles.statValue}>#{cyclePosition.position_number}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Expected payout</Text>
              <Text style={styles.statValue}>{formatDate(cyclePosition.expected_payout_date)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Amount</Text>
              <Text style={styles.statValue}>{formatKES(cyclePosition.payout_amount)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Status</Text>
              <Text style={[
                styles.statValue,
                cyclePosition.status === 'PAID' ? styles.paidText : styles.pendingText
              ]}>
                {cyclePosition.status}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>Not currently part of an active cycle</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20
  },
  greeting: { fontSize: 14, color: '#4B4B4B' },
  memberName: { fontSize: 22, fontWeight: '700', color: '#1B5E20' },
  memberNumber: { fontSize: 13, color: '#888', marginTop: 2 },
  logoutText: { color: '#C62828', fontWeight: '600', fontSize: 14 },
  scoreCard: {
    backgroundColor: '#1B5E20',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center'
  },
  scoreLabel: { fontSize: 13, color: '#C8E6C9', marginBottom: 4 },
  scoreValue: { fontSize: 44, fontWeight: '800', color: '#fff' },
  scoreBreakdownRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24
  },
  scoreBreakdownItem: { alignItems: 'center' },
  scoreBreakdownLabel: { fontSize: 11, color: '#C8E6C9' },
  scoreBreakdownValue: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 2 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  cardHalf: { flex: 1, marginBottom: 0 },
  cardLabel: { fontSize: 13, color: '#777', marginBottom: 6 },
  cardValue: { fontSize: 18, fontWeight: '700', color: '#1B5E20' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  statLabel: { fontSize: 14, color: '#4B4B4B' },
  statValue: { fontSize: 14, fontWeight: '600', color: '#222' },
  paidText: { color: '#2E7D32' },
  pendingText: { color: '#F57C00' },
  emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
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