import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gql, useQuery } from '@apollo/client';

const GET_MY_SCORE_DATA = gql`
  query GetMyScoreData {
    getMyScore {
      overall_score
      contribution_score
      loan_score
      updated_at
    }
    getMyScoreHistory {
      id
      overall_score
      contribution_score
      loan_score
      reason
      recorded_at
    }
  }
`;

const formatDate = (value) => {
  if (!value) return '—';
  const num = Number(value);
  const date = !isNaN(num) && String(value).length > 8 ? new Date(num) : new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
};

const scoreColor = (score) => {
  if (score >= 75) return '#2E7D32';
  if (score >= 60) return '#F57C00';
  return '#C62828';
};

const scoreLabel = (score) => {
  if (score >= 75) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
};

export default function ScoreScreen() {
  const { data, loading, error, refetch } = useQuery(GET_MY_SCORE_DATA, {
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
          <Text style={styles.errorText}>Failed to load score</Text>
          <Text style={styles.errorDetail}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const score = data.getMyScore;
  const history = data.getMyScoreHistory;
  const rounded = Math.round(score.overall_score);

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
            <View style={[styles.scoreCircleWrap]}>
              <View style={[styles.scoreCircle, { borderColor: scoreColor(rounded) }]}>
                <Text style={[styles.scoreCircleValue, { color: scoreColor(rounded) }]}>
                  {rounded}
                </Text>
                <Text style={styles.scoreCircleMax}>/ 100</Text>
              </View>
              <Text style={[styles.scoreLabelText, { color: scoreColor(rounded) }]}>
                {scoreLabel(rounded)}
              </Text>
            </View>

            <View style={styles.breakdownRow}>
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownLabel}>Contribution Score</Text>
                <Text style={styles.breakdownValue}>{Math.round(score.contribution_score)}</Text>
              </View>
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownLabel}>Loan Score</Text>
                <Text style={styles.breakdownValue}>{Math.round(score.loan_score)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Score History</Text>
          </View>
        }
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.historyRow}>
            <View style={styles.historyLeft}>
              <Text style={styles.historyReason}>{item.reason || 'Score recalculated'}</Text>
              <Text style={styles.historyDate}>{formatDate(item.recorded_at)}</Text>
            </View>
            <Text style={[styles.historyScore, { color: scoreColor(item.overall_score) }]}>
              {Math.round(item.overall_score)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No score history yet</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7F5' },
  container: { flex: 1, backgroundColor: '#F5F7F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 40 },
  scoreCircleWrap: { alignItems: 'center', marginBottom: 20 },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  scoreCircleValue: { fontSize: 40, fontWeight: '800' },
  scoreCircleMax: { fontSize: 12, color: '#999', marginTop: -4 },
  scoreLabelText: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  breakdownRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  breakdownCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  breakdownLabel: { fontSize: 12, color: '#777', marginBottom: 6, textAlign: 'center' },
  breakdownValue: { fontSize: 24, fontWeight: '700', color: '#1B5E20' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  historyLeft: { flex: 1, marginRight: 12 },
  historyReason: { fontSize: 13, color: '#333', fontWeight: '600' },
  historyDate: { fontSize: 11, color: '#999', marginTop: 2 },
  historyScore: { fontSize: 18, fontWeight: '800' },
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