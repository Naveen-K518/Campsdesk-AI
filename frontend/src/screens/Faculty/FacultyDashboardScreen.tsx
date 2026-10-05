import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme/theme';
import { useQueryContext } from '../../context/QueryContext';
import { Query, QueryStatus } from '../../types';
import { StatusChip } from '../../components/common/StatusChip';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import * as api from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'FacultyDashboard'>;

export const FacultyDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { logout, currentUser } = useQueryContext();

  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'under_review' | 'resolved'>('all');
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [facultyRemark, setFacultyRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFacultyQueries = async () => {
    setLoading(true);
    try {
      const data = await api.getQueries();
      setQueries(data);
    } catch (err) {
      console.warn('Failed to fetch faculty queries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyQueries();
  }, []);

  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      if (filter === 'under_review') return q.status === 'under_review' || q.status === 'active';
      if (filter === 'resolved') return q.status === 'resolved' || q.status === 'completed';
      return true;
    });
  }, [queries, filter]);

  const underReviewCount = queries.filter((q) => q.status === 'under_review' || q.status === 'active').length;
  const resolvedCount = queries.filter((q) => q.status === 'resolved' || q.status === 'completed').length;

  const handleUpdateStatus = async (newStatus: QueryStatus, remark?: string) => {
    if (!selectedQuery) return;
    setActionLoading(true);
    try {
      const updated = await api.updateQueryStatus(
        selectedQuery.id,
        newStatus,
        remark || facultyRemark || `Docket marked as ${newStatus.toUpperCase()}`
      );

      setQueries((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setSelectedQuery(updated);
      setFacultyRemark('');
      Alert.alert('Status Updated', `Case ${updated.code} updated to ${newStatus.toUpperCase()}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update docket status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddRemark = async () => {
    if (!selectedQuery || !facultyRemark.trim()) return;
    setActionLoading(true);
    try {
      const updated = await api.addAuditEntry(selectedQuery.id, {
        text: facultyRemark.trim(),
        actionTaken: 'Official Faculty Reviewer Endorsement',
        statusBanner: 'FACULTY NOTE APPENDED',
      });
      setQueries((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setSelectedQuery(updated);
      setFacultyRemark('');
      Alert.alert('Remark Logged', 'Your official remark has been recorded to the Senate audit transcript.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to append remark');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerTop}>
          <View style={styles.facultyBadgeRow}>
            <View style={styles.facultyAvatar}>
              <Ionicons name="school" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.facultyName}>{currentUser?.name || 'Dr. K. Radhakrishnan'}</Text>
              <Text style={styles.facultyRole}>HOD Queue • Senate Adjudicator</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              logout();
              navigation.replace('Login');
            }}
            style={styles.signOutBtn}
          >
            <Ionicons name="log-out-outline" size={16} color="#DC2626" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Segmented Filter */}
        <View style={styles.segmentRow}>
          <TouchableOpacity
            onPress={() => setFilter('all')}
            style={[styles.segmentItem, filter === 'all' && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentLabel, filter === 'all' && styles.segmentLabelActive]}>
              All ({queries.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter('under_review')}
            style={[styles.segmentItem, filter === 'under_review' && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentLabel, filter === 'under_review' && styles.segmentLabelActive]}>
              Pending Review ({underReviewCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter('resolved')}
            style={[styles.segmentItem, filter === 'resolved' && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentLabel, filter === 'resolved' && styles.segmentLabelActive]}>
              Resolved ({resolvedCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Query List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={styles.emptyText}>Loading university dockets from database…</Text>
        ) : filteredQueries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="file-tray-outline" size={36} color={theme.colors.text.muted} />
            <Text style={styles.emptyTitle}>No dockets in this category</Text>
            <Text style={styles.emptySub}>All student requests in this queue are processed.</Text>
          </View>
        ) : (
          filteredQueries.map((q) => (
            <TouchableOpacity
              key={q.id}
              onPress={() => setSelectedQuery(q)}
              style={styles.docketCard}
              activeOpacity={0.8}
            >
              <View style={styles.docketTopRow}>
                <View style={styles.codeWrap}>
                  <Text style={styles.docketCode}>{q.code}</Text>
                  <StatusChip status={q.priority} label={q.priority.toUpperCase()} size="sm" />
                </View>
                <StatusChip status={q.status} size="sm" />
              </View>

              <Text style={styles.docketTitle}>{q.title}</Text>
              <Text style={styles.docketDesc} numberOfLines={2}>
                {q.description}
              </Text>

              <View style={styles.docketFooter}>
                <Text style={styles.docketCategory}>{q.category}</Text>
                <Text style={styles.docketDate}>
                  {new Date(q.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Docket Detail & Adjudication Modal */}
      {selectedQuery ? (
        <Modal
          visible={Boolean(selectedQuery)}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedQuery(null)}
        >
          <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 12) }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedQuery(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={theme.colors.text.heading} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Adjudicate Docket {selectedQuery.code}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Docket Overview */}
              <View style={styles.overviewCard}>
                <View style={styles.modalStatusRow}>
                  <Text style={styles.overviewCategory}>{selectedQuery.category}</Text>
                  <StatusChip status={selectedQuery.status} />
                </View>
                <Text style={styles.overviewTitle}>{selectedQuery.title}</Text>
                <Text style={styles.overviewDesc}>{selectedQuery.description}</Text>
                {selectedQuery.citation ? (
                  <View style={styles.citationBadge}>
                    <Ionicons name="book-outline" size={13} color={theme.colors.primary} />
                    <Text style={styles.citationText}>{selectedQuery.citation}</Text>
                  </View>
                ) : null}
              </View>

              {/* Audit Transcript */}
              <Text style={styles.modalSectionTitle}>Official Audit Transcript</Text>
              <View style={styles.auditList}>
                {selectedQuery.auditTranscript && selectedQuery.auditTranscript.length > 0 ? (
                  selectedQuery.auditTranscript.map((entry) => (
                    <View key={entry.id} style={styles.auditCard}>
                      <View style={styles.auditHeader}>
                        <Text style={styles.auditAuthor}>{entry.authorName}</Text>
                        <Text style={styles.auditTime}>{entry.timestamp}</Text>
                      </View>
                      {entry.statusBanner ? (
                        <View style={styles.statusBanner}>
                          <Text style={styles.statusBannerText}>{entry.statusBanner}</Text>
                        </View>
                      ) : null}
                      {entry.text ? <Text style={styles.auditText}>{entry.text}</Text> : null}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptySub}>No audit entries logged yet.</Text>
                )}
              </View>

              {/* Adjudication Input */}
              <Text style={styles.modalSectionTitle}>HOD / Faculty Decision</Text>
              <View style={styles.actionCard}>
                <TextInput
                  value={facultyRemark}
                  onChangeText={setFacultyRemark}
                  placeholder="Enter official executive comments or stipulations…"
                  placeholderTextColor={theme.colors.text.muted}
                  style={styles.remarkInput}
                  multiline
                />

                <View style={styles.btnRow}>
                  <PrimaryButton
                    title="✓ Approve & Resolve"
                    onPress={() => handleUpdateStatus('resolved', facultyRemark || 'Condonation granted under Senate Ordinance Sec 4.2.')}
                    loading={actionLoading}
                    size="md"
                    style={{ flex: 1, backgroundColor: '#059669' }}
                  />
                  <TouchableOpacity
                    onPress={() => handleUpdateStatus('action_required', facultyRemark || 'Please submit physical stamped hospital summary.')}
                    style={styles.actionRequiredBtn}
                  >
                    <Text style={styles.actionRequiredText}>Request Physical Doc</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleAddRemark}
                  style={styles.appendRemarkBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-outline" size={14} color={theme.colors.primary} />
                  <Text style={styles.appendRemarkText}>Append Remark Without Status Change</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingHorizontal: 16,
    paddingBottom: 12,
    ...theme.shadows.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  facultyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facultyAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  facultyName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  facultyRole: {
    fontSize: 11,
    color: theme.colors.text.muted,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    gap: 4,
  },
  signOutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.radii.md,
    padding: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: theme.radii.sm,
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    ...theme.shadows.sm,
  },
  segmentLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.text.muted,
  },
  segmentLabelActive: {
    fontWeight: '800',
    color: theme.colors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.text.muted,
    marginTop: 24,
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.heading,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginTop: 4,
  },
  docketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.sm,
  },
  docketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docketCode: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  docketTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.heading,
    marginBottom: 4,
  },
  docketDesc: {
    fontSize: 12.5,
    color: theme.colors.text.body,
    lineHeight: 17,
    marginBottom: 10,
  },
  docketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  docketCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  docketDate: {
    fontSize: 11,
    color: theme.colors.text.muted,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 36,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  modalStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  overviewCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  overviewTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: 6,
  },
  overviewDesc: {
    fontSize: 13,
    color: theme.colors.text.body,
    lineHeight: 18,
    marginBottom: 8,
  },
  citationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    alignSelf: 'flex-start',
  },
  citationText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: 8,
  },
  auditList: {
    marginBottom: 16,
  },
  auditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  auditAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.heading,
  },
  auditTime: {
    fontSize: 10.5,
    color: theme.colors.text.muted,
  },
  statusBanner: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginVertical: 4,
  },
  statusBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
  },
  auditText: {
    fontSize: 12,
    color: theme.colors.text.body,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  remarkInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: theme.radii.md,
    padding: 10,
    fontSize: 13,
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionRequiredBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: theme.radii.md,
  },
  actionRequiredText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  appendRemarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  appendRemarkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
