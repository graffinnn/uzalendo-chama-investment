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
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';
import { useAuth } from '../../context/AuthContext';

const GET_ADMIN_DASHBOARD = gql`
  query GetAdminDashboard {
    getAdminDashboard {
      member_counts {
        total
        active
        pending
        inactive
      }
      pool_funds_total
      savings_total
      loan_summary {
        active_count
        active_total
        overdue_count
        pending_approval_count
      }
      cycle_status {
        has_active_cycle
        next_payout_member
        next_payout_date
        payout_amount
      }
      portfolio_total
      top_members {
        full_name
        member_number
        overall_score
      }
      recent_activity {
        id
        action
        details
        performed_by
        performed_at
      }
    }
  }
`;

const formatKES = (amount) => {
  const num = Number(amount) || 0;
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
};

const formatDate = (value) => {
  if (!value) return '—';
  const num = Number(value);
  const date = !isNaN(num) && String(value).length > 8 ? new Date(num) : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const { data, loading, error, refetch } = useQuery(GET_ADMIN_DASHBOARD, {
    fetchPolicy: 'network-only'
  });

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
          <Text style={styles.errorText}>Failed to load dashboard</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const d = data.getAdminDashboard;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
            <Text style={styles.adminName}>{user?.full_name || 'Treasurer'}</Text>
          </View>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>Pool Funds</Text>
            <Text style={styles.cardValue}>{formatKES(d.pool_funds_total)}</Text>
          </View>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>Savings</Text>
            <Text style={styles.cardValue}>{formatKES(d.savings_total)}</Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>Portfolio Value</Text>
            <Text style={styles.cardValue}>{formatKES(d.portfolio_total)}</Text>
          </View>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>Members</Text>
            <Text style={styles.cardValue}>{d.member_counts.total}</Text>
            <Text style={styles.cardSubtext}>
              {d.member_counts.active} active · {d.member_counts.pending} pending
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Loans</Text>
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Active loans</Text>
            <Text style={styles.statValue}>{d.loan_summary.active_count} ({formatKES(d.loan_summary.active_total)})</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Pending approval</Text>
            <Text style={styles.statValue}>{d.loan_summary.pending_approval_count}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, d.loan_summary.overdue_count > 0 && styles.warningText]}>
              Overdue repayments
            </Text>
            <Text style={[styles.statValue, d.loan_summary.overdue_count > 0 && styles.warningText]}>
              {d.loan_summary.overdue_count}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Current Cycle</Text>
        <View style={styles.card}>
          {d.cycle_status.has_active_cycle ? (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Next payout</Text>
                <Text style={styles.statValue}>{d.cycle_status.next_payout_member || '—'}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Payout date</Text>
                <Text style={styles.statValue}>{formatDate(d.cycle_status.next_payout_date)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Amount</Text>
                <Text style={styles.statValue}>{formatKES(d.cycle_status.payout_amount)}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>No active cycle</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Top Members</Text>
        <View style={styles.card}>
          {d.top_members.length === 0 ? (
            <Text style={styles.emptyText}>No scored members yet</Text>
          ) : (
            d.top_members.map((m, i) => (
              <View key={m.member_number} style={styles.statRow}>
                <Text style={styles.statLabel}>{i + 1}. {m.full_name}</Text>
                <Text style={styles.scoreValue}>{Math.round(m.overall_score)}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.card}>
          {d.recent_activity.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity</Text>
          ) : (
            d.recent_activity.map((log) => (
              <View key={log.id} style={styles.activityRow}>
                <Text style={styles.activityAction}>{log.action.replace(/_/g, ' ')}</Text>
                <Text style={styles.activityDetails}>{log.details}</Text>
                <Text style={styles.activityMeta}>
                  {log.performed_by} · {formatDate(log.performed_at)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7F5' },
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  greeting: { fontSize: 14, color: '#4B4B4B' },
  adminName: { fontSize: 22, fontWeight: '700', color: '#1B5E20' },
  logoutText: { color: '#C62828', fontWeight: '600', fontSize: 14 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
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
  cardHalf: { flex: 1 },
  cardLabel: { fontSize: 13, color: '#777', marginBottom: 6 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#1B5E20' },
  cardSubtext: { fontSize: 12, color: '#888', marginTop: 4 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
    marginBottom: 10
  },
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
  scoreValue: { fontSize: 14, fontWeight: '700', color: '#2E7D32' },
  warningText: { color: '#C62828' },
  emptyText: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  activityRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  activityAction: { fontSize: 13, fontWeight: '700', color: '#2E7D32', marginBottom: 2 },
  activityDetails: { fontSize: 13, color: '#333', marginBottom: 2 },
  activityMeta: { fontSize: 11, color: '#999' },
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