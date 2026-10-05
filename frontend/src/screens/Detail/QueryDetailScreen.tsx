import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme/theme';
import { useQueryContext } from '../../context/QueryContext';
import { StatusChip } from '../../components/common/StatusChip';
import { EscalationTimeline } from '../../components/workflow/EscalationTimeline';

type Props = NativeStackScreenProps<RootStackParamList, 'QueryDetail'>;

export const QueryDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { queryId } = route.params;
  const { queries, addAuditEntry, updateQueryStatus } = useQueryContext();

  const [replyText, setReplyText] = useState('');

  const query = queries.find((q) => q.id === queryId) || queries[0];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `CampusDesk AI Case Docket ${query.code}: ${query.title} (Status: ${query.status})`,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;

    addAuditEntry(query.id, {
      sender: 'student',
      authorName: 'Aarav Sharma (Student)',
      text: replyText.trim(),
    });

    setReplyText('');
    Alert.alert('Response Logged', 'Your response has been appended to the official Senate Audit Transcript.');
  };

  const handleActionPill = (action: string) => {
    if (action === 'Acknowledge & Thank') {
      addAuditEntry(query.id, {
        sender: 'student',
        authorName: 'Aarav Sharma (Student)',
        text: 'Thank you respected HOD for the prompt approval. I will collect the physical hall ticket today.',
      });
      updateQueryStatus(query.id, 'resolved');
      Alert.alert('Acknowledged', 'Thank-you note dispatched and case updated to Resolved.');
    } else if (action === 'Submit Physical Copy Confirmation') {
      addAuditEntry(query.id, {
        sender: 'student',
        authorName: 'Aarav Sharma (Student)',
        text: 'Physical original hospital certificate submitted to Academic Block 3 reception.',
      });
      Alert.alert('Physical Copy Logged', 'Department registry clerk has been notified.');
    } else {
      Alert.alert('Status Update', 'An automated status ping has been routed to the Faculty Advisor Queue.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text.heading} />
          </TouchableOpacity>

          <View style={styles.ticketCodeBlock}>
            <Text style={styles.ticketCode}>{query.code}</Text>
            <StatusChip status={query.priority} label={query.priority.toUpperCase()} size="sm" />
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
              <Ionicons name="share-outline" size={20} color={theme.colors.text.body} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Alert.alert('Case Options', 'Download PDF Docket\nRequest Dean Escalation\nPrint Audit Receipt')}
              style={styles.actionBtn}
            >
              <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.text.body} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category & Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{query.category}</Text>
          </View>
          <View style={styles.subjectPill}>
            <Text style={styles.subjectText}>{query.subject}</Text>
          </View>
          {query.daysCondonation ? (
            <View style={styles.condonationPill}>
              <Text style={styles.condonationText}>
                {query.daysCondonation} Days Condonation
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.detailTitle}>{query.title}</Text>
        <Text style={styles.submittedDate}>
          Submitted {new Date(query.createdAt).toLocaleDateString()} • {query.citation || 'Official Senate Ordinance'}
        </Text>
      </View>

      {/* Main Scroll Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Escalation Pipeline Stepper */}
        <EscalationTimeline />

        {/* Audit Transcript Section */}
        <View style={styles.transcriptHeaderRow}>
          <Text style={styles.transcriptTitle}>Audit Transcript</Text>
          <View style={styles.transcriptCountBadge}>
            <Text style={styles.transcriptCountText}>
              {query.auditTranscript ? query.auditTranscript.length : 3} ENTRIES
            </Text>
          </View>
        </View>

        {/* Audit Entries */}
        <View style={styles.transcriptContainer}>
          {query.auditTranscript && query.auditTranscript.length > 0 ? (
            query.auditTranscript.map((entry) => {
              const isStudent = entry.sender === 'student';
              const isAgent = entry.sender === 'agent';
              const isFaculty = entry.sender === 'faculty';

              return (
                <View
                  key={entry.id}
                  style={[
                    styles.transcriptCard,
                    isAgent && styles.transcriptCardAgent,
                    isFaculty && styles.transcriptCardFaculty,
                  ]}
                >
                  {/* Entry Header */}
                  <View style={styles.entryHeaderRow}>
                    <View style={styles.entryAuthorBlock}>
                      <View
                        style={[
                          styles.authorAvatar,
                          isAgent && styles.avatarAgent,
                          isFaculty && styles.avatarFaculty,
                        ]}
                      >
                        <Ionicons
                          name={isAgent ? 'sparkles' : isFaculty ? 'school' : 'person'}
                          size={14}
                          color="#FFFFFF"
                        />
                      </View>
                      <View>
                        <Text style={styles.entryAuthor}>{entry.authorName}</Text>
                        {entry.roleBadge ? (
                          <View style={styles.roleBadgePill}>
                            <Text style={styles.roleBadgeText}>{entry.roleBadge}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Text style={styles.entryTimestamp}>{entry.timestamp}</Text>
                  </View>

                  {/* Status banner for faculty approvals */}
                  {entry.statusBanner ? (
                    <View style={styles.statusBannerBox}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      <Text style={styles.statusBannerText}>{entry.statusBanner}</Text>
                    </View>
                  ) : null}

                  {/* Regular Text */}
                  {entry.text ? (
                    <Text style={styles.entryText}>{entry.text}</Text>
                  ) : null}

                  {/* Attached Document Card */}
                  {entry.attachedDoc ? (
                    <View style={styles.docAttachment}>
                      <View style={styles.docIconBox}>
                        <Ionicons name="document-attach" size={22} color={theme.colors.primary} />
                      </View>
                      <View style={styles.docDetails}>
                        <Text style={styles.docName}>{entry.attachedDoc.name}</Text>
                        <Text style={styles.docMeta}>
                          {entry.attachedDoc.size} • {entry.attachedDoc.caption}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* AI Bullet points */}
                  {entry.bulletPoints ? (
                    <View style={styles.bulletsContainer}>
                      <Text style={styles.bulletSectionTitle}>
                        AI Analysis & Ordinance Check:
                      </Text>
                      {entry.bulletPoints.map((pt, i) => (
                        <View key={i} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletText}>{pt}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Action Taken */}
                  {entry.actionTaken ? (
                    <View style={styles.actionTakenBox}>
                      <Text style={styles.actionTakenLabel}>ACTION TAKEN:</Text>
                      <Text style={styles.actionTakenText}>{entry.actionTaken}</Text>
                    </View>
                  ) : null}

                  {/* Department Registry Token */}
                  {entry.tokenRef ? (
                    <View style={styles.tokenPill}>
                      <Ionicons name="key-outline" size={12} color="#059669" />
                      <Text style={styles.tokenText}>
                        Registry Token: {entry.tokenRef}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <Text style={styles.noTranscript}>No audit entries yet.</Text>
          )}
        </View>

        {/* Quick Action Pills */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            onPress={() => handleActionPill('Acknowledge & Thank')}
            style={styles.quickActionPill}
            activeOpacity={0.75}
          >
            <Text style={styles.quickActionText}>Acknowledge & Thank</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleActionPill('Submit Physical Copy Confirmation')}
            style={styles.quickActionPill}
            activeOpacity={0.75}
          >
            <Text style={styles.quickActionText}>Submit Physical Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleActionPill('Request Status Update')}
            style={styles.quickActionPill}
            activeOpacity={0.75}
          >
            <Text style={styles.quickActionText}>Request Status Update</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Pinned Reply Bar */}
      <View style={[styles.replyBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.replyInputWrap}>
          <TextInput
            value={replyText}
            onChangeText={setReplyText}
            placeholder={`Reply to ${query.assignedTo || 'Faculty'} / AI…`}
            placeholderTextColor={theme.colors.text.muted}
            style={styles.replyInputField}
          />
          <TouchableOpacity
            onPress={() => Alert.alert('Voice Note', 'Voice recording initiated…')}
            style={styles.replyMicBtn}
          >
            <Ionicons name="mic-outline" size={18} color={theme.colors.text.subtle} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSendReply}
            style={[
              styles.replySendBtn,
              replyText.trim().length > 0 && styles.replySendActive,
            ]}
          >
            <Ionicons name="send" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
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
    borderBottomColor: '#EEF2F6',
    paddingHorizontal: 16,
    paddingBottom: 14,
    ...theme.shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    padding: 4,
  },
  ticketCodeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketCode: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text.heading,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    padding: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  subjectPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  subjectText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.subtle,
  },
  condonationPill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  condonationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: 4,
    lineHeight: 22,
  },
  submittedDate: {
    fontSize: 11.5,
    color: theme.colors.text.muted,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  transcriptHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  transcriptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  transcriptCountBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  transcriptCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  transcriptContainer: {
    marginBottom: 16,
  },
  transcriptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...theme.shadows.sm,
  },
  transcriptCardAgent: {
    backgroundColor: '#F8FAFF',
    borderColor: '#C7D2FE',
  },
  transcriptCardFaculty: {
    backgroundColor: '#F0FDF4',
    borderColor: '#A7F3D0',
  },
  entryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  entryAuthorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarAgent: {
    backgroundColor: '#6366F1',
  },
  avatarFaculty: {
    backgroundColor: '#059669',
  },
  entryAuthor: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  roleBadgePill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  entryTimestamp: {
    fontSize: 10.5,
    color: theme.colors.text.muted,
  },
  statusBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    gap: 6,
    marginBottom: 8,
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  entryText: {
    fontSize: 13,
    color: theme.colors.text.body,
    lineHeight: 19,
    marginBottom: 8,
  },
  docAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: theme.radii.md,
    padding: 10,
    marginTop: 4,
  },
  docIconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  docDetails: {
    flex: 1,
  },
  docName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.text.heading,
  },
  docMeta: {
    fontSize: 10.5,
    color: theme.colors.text.muted,
    marginTop: 1,
  },
  bulletsContainer: {
    marginTop: 6,
    marginBottom: 8,
  },
  bulletSectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.text.heading,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  bulletDot: {
    fontSize: 13,
    color: theme.colors.primary,
    marginRight: 6,
    lineHeight: 17,
  },
  bulletText: {
    fontSize: 12,
    color: theme.colors.text.body,
    flex: 1,
    lineHeight: 17,
  },
  actionTakenBox: {
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: theme.radii.sm,
    marginTop: 6,
  },
  actionTakenLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actionTakenText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.text.heading,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.xs,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 4,
  },
  tokenText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },
  noTranscript: {
    fontSize: 13,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginVertical: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  quickActionPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    ...theme.shadows.sm,
  },
  quickActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  replyBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  replyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: theme.radii.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  replyInputField: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.heading,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  replyMicBtn: {
    padding: 6,
  },
  replySendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  replySendActive: {
    backgroundColor: theme.colors.primary,
  },
});
