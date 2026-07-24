import React from 'react';
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
import { gql, useQuery, useMutation } from '@apollo/client';

const GET_MEMBERS = gql`
  query GetMembers {
    getMembers {
      id
      full_name
      member_number
      status
      overall_score
      joined_at
    }
  }
`;

const ACTIVATE_MEMBER = gql`
  mutation ActivateMember($memberId: ID!) {
    activateMember(memberId: $memberId) {
      id
      status
    }
  }
`;

const DEACTIVATE_MEMBER = gql`
  mutation DeactivateMember($memberId: ID!) {
    deactivateMember(memberId: $memberId) {
      id
      status
    }
  }
`;

const statusColors = {
  ACTIVE: '#2E7D32',
  PENDING: '#F57C00',
  INACTIVE: '#C62828'
};

export default function ManageMembersScreen() {
  const { data, loading, error, refetch } = useQuery(GET_MEMBERS, {
    fetchPolicy: 'network-only'
  });

  const [activateMember, { loading: activating }] = useMutation(ACTIVATE_MEMBER, {
    onCompleted: () => refetch(),
    onError: (err) => Alert.alert('Error', err.message)
  });

  const [deactivateMember, { loading: deactivating }] = useMutation(DEACTIVATE_MEMBER, {
    onCompleted: () => refetch(),
    onError: (err) => Alert.alert('Error', err.message)
  });

  const handleActivate = (member) => {
    Alert.alert(
      'Activate Member',
      `Activate ${member.full_name} (${member.member_number})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Activate', onPress: () => activateMember({ variables: { memberId: member.id } }) }
      ]
    );
  };

  const handleDeactivate = (member) => {
    Alert.alert(
      'Deactivate Member',
      `Deactivate ${member.full_name} (${member.member_number})? They will not be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => deactivateMember({ variables: { memberId: member.id } }) }
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
        <Text style={styles.errorText}>Failed to load members</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const members = data.getMembers;
  const busy = activating || deactivating;

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Members ({members.length})</Text>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} colors={['#2E7D32']} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{item.full_name}</Text>
                <Text style={styles.memberNumber}>{item.member_number}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
                <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                  {item.status}
                </Text>
              </View>
            </View>

            {item.overall_score !== null && (
              <Text style={styles.scoreText}>Score: {Math.round(item.overall_score)}</Text>
            )}

            <View style={styles.actionRow}>
              {item.status === 'PENDING' && (
                <TouchableOpacity
                  style={styles.activateButton}
                  onPress={() => handleActivate(item)}
                  disabled={busy}
                >
                  <Text style={styles.activateButtonText}>Activate</Text>
                </TouchableOpacity>
              )}
              {item.status === 'ACTIVE' && (
                <TouchableOpacity
                  style={styles.deactivateButton}
                  onPress={() => handleDeactivate(item)}
                  disabled={busy}
                >
                  <Text style={styles.deactivateButtonText}>Deactivate</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No members registered yet</Text>
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  memberName: { fontSize: 16, fontWeight: '700', color: '#222' },
  memberNumber: { fontSize: 13, color: '#777', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  scoreText: { fontSize: 13, color: '#2E7D32', marginTop: 8, fontWeight: '600' },
  actionRow: { flexDirection: 'row', marginTop: 12 },
  activateButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8
  },
  activateButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  deactivateButton: {
    backgroundColor: '#FEEBEE',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8
  },
  deactivateButtonText: { color: '#C62828', fontWeight: '700', fontSize: 13 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 40, fontStyle: 'italic' },
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