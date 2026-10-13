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

type Props = NativeStackScreenProps<RootStackParamList, any>;

export const FacultyDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { logout, currentUser } = useQueryContext();

  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'under_review' | 'resolved'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'normal'>('all');
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [facultyRemark, setFacultyRemark] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchFacultyQueries = async () => {
    setLoading(true);
    try {
      const data = await api.getQueries();
      setQueries(data);
    } catch (err) {
      console.warn('Failed to fetch mentor queries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyQueries();
  }, []);

  const PRIORITY_WEIGHT: Record<string, number> = {
    urgent: 1,
    high: 2,
    normal: 3,
  };

  const filteredQueries = useMemo(() => {
    return queries
      .filter((q) => {
        if (filter === 'under_review' && !(q.status === 'under_review' || q.status === 'active')) return false;
        if (filter === 'resolved' && !(q.status === 'resolved' || q.status === 'completed')) return false;
        if (priorityFilter !== 'all' && q.priority !== priorityFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // Priority weight: Urgent (1) -> High (2) -> Normal (3)
        const pA = PRIORITY_WEIGHT[a.priority] || 4;
        const pB = PRIORITY_WEIGHT[b.priority] || 4;
        if (pA !== pB) return pA - pB;

        // Pending / Under Review first
        const aActive = a.status === 'under_review' || a.status === 'active' ? 0 : 1;
        const bActive = b.status === 'under_review' || b.status === 'active' ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [queries, filter, priorityFilter]);

  const underReviewCount = queries.filter((q) => q.status === 'under_review' || q.status === 'active').length;
  const resolvedCount = queries.filter((q) => q.status === 'resolved' || q.status === 'completed').length;
  const urgentCount = queries.filter((q) => q.priority === 'urgent' && (q.status === 'under_review' || q.status === 'active')).length;
  const highCount = queries.filter((q) => q.priority === 'high' && (q.status === 'under_review' || q.status === 'active')).length;

  const handleUpdatePriority = async (newPriority: 'normal' | 'high' | 'urgent') => {
    if (!selectedQuery) return;
    setActionLoading(true);
    try {
      const updated = await api.updateQueryPriority(
        selectedQuery.id,
        newPriority,
        `Faculty mentor adjusted priority to ${newPriority.toUpperCase()}`
      );

      setQueries((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
      setSelectedQuery(updated);
      Alert.alert('Priority Updated', `Docket ${updated.code} set to ${newPriority.toUpperCase()} priority.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update docket priority');
    } finally {
      setActionLoading(false);
    }
  };

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
        actionTaken: 'Official Faculty Mentor Endorsement',
        statusBanner: 'MENTOR NOTE APPENDED',
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
              <Text style={styles.facultyRole}>Mentor Queue • Academic Mentor</Text>
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

        {/* Priority Filter Pills */}
        <View style={styles.priorityFilterRow}>
          <TouchableOpacity
            onPress={() => setPriorityFilter('all')}
            style={[styles.priorityPill, priorityFilter === 'all' && styles.priorityPillActive]}
          >
            <Text style={[styles.priorityPillText, priorityFilter === 'all' && styles.priorityPillTextActive]}>
              All Priorities ({queries.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriorityFilter('urgent')}
            style={[
              styles.priorityPill,
              styles.priorityPillUrgent,
              priorityFilter === 'urgent' && styles.priorityPillUrgentActive,
            ]}
          >
            <Ionicons name="flame" size={13} color={priorityFilter === 'urgent' ? '#FFFFFF' : '#EF4444'} />
            <Text
              style={[
                styles.priorityPillText,
                styles.priorityPillUrgentText,
                priorityFilter === 'urgent' && styles.priorityPillActiveTextWhite,
              ]}
            >
              Urgent ({urgentCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriorityFilter('high')}
            style={[
              styles.priorityPill,
              styles.priorityPillHigh,
              priorityFilter === 'high' && styles.priorityPillHighActive,
            ]}
          >
            <Ionicons name="flash" size={12} color={priorityFilter === 'high' ? '#FFFFFF' : '#F59E0B'} />
            <Text
              style={[
                styles.priorityPillText,
                styles.priorityPillHighText,
                priorityFilter === 'high' && styles.priorityPillActiveTextWhite,
              ]}
            >
              High ({highCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriorityFilter('normal')}
            style={[styles.priorityPill, priorityFilter === 'normal' && styles.priorityPillActive]}
          >
            <Text style={[styles.priorityPillText, priorityFilter === 'normal' && styles.priorityPillTextActive]}>
              Normal
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Query List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Urgent Attention Alert Banner */}
        {urgentCount > 0 && priorityFilter !== 'urgent' && (
          <TouchableOpacity
            onPress={() => {
              setPriorityFilter('urgent');
              setFilter('under_review');
            }}
            style={styles.urgentBanner}
            activeOpacity={0.85}
          >
            <View style={styles.urgentBannerIcon}>
              <Ionicons name="flame" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.urgentBannerTitle}>
                {urgentCount} Urgent {urgentCount === 1 ? 'Docket' : 'Dockets'} Pending Action
              </Text>
              <Text style={styles.urgentBannerSub}>
                Auto-prioritized by policy rules (e.g., examination within 24h, attendance &lt; 65%).
              </Text>
            </View>
            <View style={styles.urgentBannerBadge}>
              <Text style={styles.urgentBannerBadgeText}>View</Text>
            </View>
          </TouchableOpacity>
        )}

        {loading ? (
          <Text style={styles.emptyText}>Loading mentor queue dockets from database…</Text>
        ) : filteredQueries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="file-tray-outline" size={36} color={theme.colors.text.muted} />
            <Text style={styles.emptyTitle}>No dockets in this category</Text>
            <Text style={styles.emptySub}>All student requests in your mentor queue are processed.</Text>
          </View>
        ) : (
          filteredQueries.map((q) => (
            <TouchableOpacity
              key={q.id}
              onPress={() => setSelectedQuery(q)}
              style={[
                styles.docketCard,
                q.priority === 'urgent' && styles.docketCardUrgent,
                q.priority === 'high' && styles.docketCardHigh,
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.docketTopRow}>
                <View style={styles.codeWrap}>
                  <Text style={styles.docketCode}>{q.code}</Text>
                  <StatusChip status={q.priority} label={q.priority.toUpperCase()} size="sm" />
                  {q.priority === 'urgent' && (
                    <View style={styles.urgentBadgeTag}>
                      <Ionicons name="flame" size={11} color="#DC2626" />
                      <Text style={styles.urgentBadgeTagText}>Priority Queue</Text>
                    </View>
                  )}
                </View>
                <StatusChip status={q.status} size="sm" />
              </View>

              {/* Mentee info badge with name and roll number */}
              <View style={styles.menteeRow}>
                <Ionicons name="person-circle-outline" size={15} color={theme.colors.primary} />
                <Text style={styles.menteeLabel}>Mentee:</Text>
                <Text style={styles.menteeName}>{q.studentName || 'Mentee'}</Text>
                {q.studentRollNo ? (
                  <View style={styles.rollBadge}>
                    <Text style={styles.rollBadgeText}>{q.studentRollNo}</Text>
                  </View>
                ) : null}
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
              <Text style={styles.modalTitle}>Review Docket {selectedQuery.code}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Docket Overview */}
              <View style={styles.overviewCard}>
                <View style={styles.modalStatusRow}>
                  <Text style={styles.overviewCategory}>{selectedQuery.category}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <StatusChip status={selectedQuery.priority} label={selectedQuery.priority.toUpperCase()} />
                    <StatusChip status={selectedQuery.status} />
                  </View>
                </View>

                {/* Mentee details banner in modal */}
                <View style={styles.modalMenteeBanner}>
                  <Ionicons name="school-outline" size={16} color={theme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalMenteeName}>
                      Mentee: {selectedQuery.studentName || 'Student'}
                      {selectedQuery.studentRollNo ? ` (${selectedQuery.studentRollNo})` : ''}
                    </Text>
                    {selectedQuery.studentDepartment ? (
                      <Text style={styles.modalMenteeDept}>{selectedQuery.studentDepartment}</Text>
                    ) : null}
                  </View>
                </View>

                <Text style={styles.overviewTitle}>{selectedQuery.title}</Text>
                <Text style={styles.overviewDesc}>{selectedQuery.description}</Text>
                {selectedQuery.subLine ? (
                  <View style={styles.triageReasonBox}>
                    <Ionicons name="information-circle-outline" size={14} color="#0369A1" />
                    <Text style={styles.triageReasonText}>{selectedQuery.subLine}</Text>
                  </View>
                ) : null}
                {selectedQuery.citation ? (
                  <View style={styles.citationBadge}>
                    <Ionicons name="book-outline" size={13} color={theme.colors.primary} />
                    <Text style={styles.citationText}>{selectedQuery.citation}</Text>
                  </View>
                ) : null}
              </View>

              {/* Priority Override Control for Mentor */}
              <Text style={styles.modalSectionTitle}>Adjust Priority Level</Text>
              <View style={styles.prioritySelectorCard}>
                <View style={styles.priorityModalRow}>
                  <TouchableOpacity
                    onPress={() => handleUpdatePriority('urgent')}
                    style={[
                      styles.modalPriorityBtn,
                      selectedQuery.priority === 'urgent' && styles.modalPriorityBtnUrgentActive,
                    ]}
                    disabled={actionLoading}
                  >
                    <Ionicons name="flame" size={14} color={selectedQuery.priority === 'urgent' ? '#FFFFFF' : '#EF4444'} />
                    <Text
                      style={[
                        styles.modalPriorityBtnText,
                        selectedQuery.priority === 'urgent' && styles.modalPriorityBtnTextWhite,
                      ]}
                    >
                      Urgent
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleUpdatePriority('high')}
                    style={[
                      styles.modalPriorityBtn,
                      selectedQuery.priority === 'high' && styles.modalPriorityBtnHighActive,
                    ]}
                    disabled={actionLoading}
                  >
                    <Ionicons name="flash" size={14} color={selectedQuery.priority === 'high' ? '#FFFFFF' : '#F59E0B'} />
                    <Text
                      style={[
                        styles.modalPriorityBtnText,
                        selectedQuery.priority === 'high' && styles.modalPriorityBtnTextWhite,
                      ]}
                    >
                      High
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleUpdatePriority('normal')}
                    style={[
                      styles.modalPriorityBtn,
                      selectedQuery.priority === 'normal' && styles.modalPriorityBtnNormalActive,
                    ]}
                    disabled={actionLoading}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={14}
                      color={selectedQuery.priority === 'normal' ? '#FFFFFF' : '#10B981'}
                    />
                    <Text
                      style={[
                        styles.modalPriorityBtnText,
                        selectedQuery.priority === 'normal' && styles.modalPriorityBtnTextWhite,
                      ]}
                    >
                      Normal
                    </Text>
                  </TouchableOpacity>
                </View>
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
              <Text style={styles.modalSectionTitle}>Mentor Decision</Text>
              <View style={styles.actionCard}>
                <TextInput
                  value={facultyRemark}
                  onChangeText={setFacultyRemark}
                  placeholder="Enter official mentor comments or stipulations…"
                  placeholderTextColor={theme.colors.text.muted}
                  style={styles.remarkInput}
                  multiline
                />

                <View style={styles.btnRow}>
                  <PrimaryButton
                    title="✓ Approve & Resolve"
                    onPress={() => handleUpdateStatus('resolved', facultyRemark || 'Approval granted under Senate Ordinance.')}
                    loading={actionLoading}
                    size="md"
                    style={{ flex: 1, backgroundColor: '#059669' }}
                  />
                  <TouchableOpacity
                    onPress={() => handleUpdateStatus('action_required', facultyRemark || 'Please submit physical stamped verification.')}
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
  menteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    marginBottom: 8,
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  menteeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  menteeName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#047857',
  },
  rollBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rollBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  modalMenteeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: theme.radii.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  modalMenteeName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#065F46',
  },
  modalMenteeDept: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  priorityFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  priorityPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priorityPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  priorityPillUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  priorityPillUrgentActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  priorityPillHigh: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  priorityPillHighActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.body,
  },
  priorityPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  priorityPillUrgentText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  priorityPillHighText: {
    color: '#B45309',
    fontWeight: '700',
  },
  priorityPillActiveTextWhite: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: theme.radii.md,
    padding: 12,
    marginBottom: 14,
    gap: 10,
    ...theme.shadows.sm,
  },
  urgentBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgentBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  urgentBannerSub: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 1,
  },
  urgentBannerBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgentBannerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  docketCardUrgent: {
    borderLeftWidth: 5,
    borderLeftColor: '#EF4444',
    backgroundColor: '#FFFBFB',
    borderColor: '#FECACA',
  },
  docketCardHigh: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFEFA',
    borderColor: '#FDE68A',
  },
  urgentBadgeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  urgentBadgeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  triageReasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  triageReasonText: {
    flex: 1,
    fontSize: 11.5,
    color: '#0369A1',
    fontWeight: '500',
  },
  prioritySelectorCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radii.md,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
  },
  priorityModalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalPriorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#FFFFFF',
  },
  modalPriorityBtnUrgentActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  modalPriorityBtnHighActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  modalPriorityBtnNormalActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modalPriorityBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.body,
  },
  modalPriorityBtnTextWhite: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});

