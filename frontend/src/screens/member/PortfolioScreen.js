import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';

const GET_MY_PORTFOLIO_DATA = gql`
  query GetMyPortfolioData {
    getPortfolio {
      total_invested
      total_current_value
      total_profit_loss
      investments {
        id
        name
        investment_type
        current_value
        profit_loss
        profit_loss_percentage
      }
    }
    getMyPortfolioShare {
      share_percentage
      estimated_value
      portfolio_total_value
    }
  }
`;

const formatKES = (amount) => {
  const num = Number(amount) || 0;
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;
};

export default function PortfolioScreen() {
  const { data, loading, error, refetch } = useQuery(GET_MY_PORTFOLIO_DATA, {
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
  const myShare = data.getMyPortfolioShare;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} colors={['#2E7D32']} />
        }
      >
        <Text style={styles.title}>Chama Portfolio</Text>

        <View style={styles.shareCard}>
          <Text style={styles.shareLabel}>Your Estimated Share</Text>
          <Text style={styles.shareValue}>{formatKES(myShare.estimated_value)}</Text>
          <Text style={styles.sharePercent}>{myShare.share_percentage}% of total portfolio</Text>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>Total Invested</Text>
            <Text style={styles.cardValue}>{formatKES(portfolio.total_invested)}</Text>
          </View>
          <View style={[styles.card, styles.cardHalf]}>
            <Text style={styles.cardLabel}>Current Value</Text>
            <Text style={styles.cardValue}>{formatKES(portfolio.total_current_value)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Holdings</Text>

        {portfolio.investments.length === 0 ? (
          <Text style={styles.emptyText}>No investments recorded yet</Text>
        ) : (
          portfolio.investments.map((inv) => (
            <View key={inv.id} style={styles.investRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.investName}>{inv.name}</Text>
                <Text style={styles.investType}>{inv.investment_type}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.investValue}>{formatKES(inv.current_value)}</Text>
                <Text style={[
                  styles.investChange,
                  { color: inv.profit_loss >= 0 ? '#2E7D32' : '#C62828' }
                ]}>
                  {inv.profit_loss >= 0 ? '+' : ''}{inv.profit_loss_percentage}%
                </Text>
              </View>
            </View>
          ))
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
  shareCard: {
    backgroundColor: '#1B5E20',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center'
  },
  shareLabel: { fontSize: 13, color: '#C8E6C9' },
  shareValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4 },
  sharePercent: { fontSize: 12, color: '#C8E6C9', marginTop: 4 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  cardHalf: { flex: 1 },
  cardLabel: { fontSize: 12, color: '#777', marginBottom: 6 },
  cardValue: { fontSize: 16, fontWeight: '700', color: '#1B5E20' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  investRow: {
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
  investName: { fontSize: 14, fontWeight: '700', color: '#222' },
  investType: { fontSize: 12, color: '#777', marginTop: 2 },
  investValue: { fontSize: 14, fontWeight: '700', color: '#222' },
  investChange: { fontSize: 12, fontWeight: '700', marginTop: 2 },
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