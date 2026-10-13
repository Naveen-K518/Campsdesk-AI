import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useQueryContext } from '../../context/QueryContext';
import { Query } from '../../types';

interface NewQueryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (createdQuery: Query) => void;
}

const CATEGORIES = [
  'Academics & Attendance',
  'Examinations & Grades',
  'Fees & Scholarship',
  'Hostel & Facilities',
  'General Inquiry',
];

export const NewQueryModal: React.FC<NewQueryModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { student, currentUser, addQuery } = useQueryContext();

  const [category, setCategory] = useState<string>('Academics & Attendance');
  const [subject, setSubject] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const mentorName = student?.mentor?.name || student?.facultyAdvisor?.name;
  const mentorEmail = student?.mentor?.email || student?.facultyAdvisor?.email;

  const handleSubmit = async () => {
    if (!subject.trim()) {
      Alert.alert('Subject Required', 'Please enter a subject or title for your query.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Description Required', 'Please enter a description for your query.');
      return;
    }

    setSubmitting(true);
    try {
      const created = addQuery({
        category,
        subject: subject.trim(),
        title: subject.trim(),
        description: description.trim(),
        priority,
        status: student?.mentor ? 'under_review' : 'unassigned',
        assignedTo: mentorName || 'Unassigned',
        assignedMentorId: student?.mentor?.id || null,
        mentorName: mentorName || undefined,
        mentorEmail: mentorEmail || undefined,
        studentName: currentUser?.name || student?.name,
        studentRollNo: student?.rollNo,
        studentDepartment: student?.department,
      });

      // Reset form
      setSubject('');
      setDescription('');
      setCategory('Academics & Attendance');
      setPriority('normal');
      onClose();

      if (onSuccess && created) {
        onSuccess(created);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit query. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconWrap}>
                <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Create New Query</Text>
                <Text style={styles.headerSubtitle}>Submit a docket to your faculty mentor</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.colors.text.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* Mentor routing badge */}
            <View style={styles.mentorBanner}>
              <Ionicons
                name={student?.mentor ? 'person-circle-outline' : 'alert-circle-outline'}
                size={22}
                color={student?.mentor ? theme.colors.primary : theme.colors.pending.text}
              />
              <View style={styles.mentorBannerText}>
                <Text style={styles.mentorBannerTitle}>
                  {student?.mentor ? `Routing to: ${mentorName}` : 'No Mentor Assigned'}
                </Text>
                <Text style={styles.mentorBannerSubtitle}>
                  {student?.mentor
                    ? `${mentorEmail} • Designated Academic Mentor`
                    : 'Will be triaged by Admin'}
                </Text>
              </View>
            </View>

            {/* Category selection */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryWrap}>
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    activeOpacity={0.7}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Subject Input */}
            <Text style={styles.fieldLabel}>Subject / Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Manual Test - Od Request for Hackathon"
              placeholderTextColor={theme.colors.text.muted}
              value={subject}
              onChangeText={setSubject}
              maxLength={120}
            />

            {/* Description Input */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="e.g. Testing auto mentor assignment for Kishor."
              placeholderTextColor={theme.colors.text.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* Urgency / Priority Selection */}
            <Text style={styles.fieldLabel}>Urgency / Priority</Text>
            <View style={styles.priorityRow}>
              <TouchableOpacity
                onPress={() => setPriority('normal')}
                style={[styles.priorityChip, priority === 'normal' && styles.priorityChipNormalActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={15}
                  color={priority === 'normal' ? '#10B981' : theme.colors.text.muted}
                />
                <Text style={[styles.priorityChipText, priority === 'normal' && styles.priorityChipTextActive]}>
                  Normal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPriority('high')}
                style={[styles.priorityChip, priority === 'high' && styles.priorityChipHighActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="flash-outline"
                  size={15}
                  color={priority === 'high' ? '#F59E0B' : theme.colors.text.muted}
                />
                <Text style={[styles.priorityChipText, priority === 'high' && styles.priorityChipTextActive]}>
                  High
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPriority('urgent')}
                style={[styles.priorityChip, priority === 'urgent' && styles.priorityChipUrgentActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="flame"
                  size={15}
                  color={priority === 'urgent' ? '#EF4444' : theme.colors.text.muted}
                />
                <Text style={[styles.priorityChipText, priority === 'urgent' && styles.priorityChipTextActive]}>
                  Urgent
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.triageNotice}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.triageNoticeText}>
                CampusDesk AI scans keywords & attendance to auto-escalate urgent issues to mentors.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.cancelBtn}
                activeOpacity={0.7}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.submitBtn}
                activeOpacity={0.85}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Submit Query</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    ...theme.shadows.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.heading,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  mentorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.primaryLight,
    padding: 12,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    marginBottom: 16,
  },
  mentorBannerText: {
    flex: 1,
  },
  mentorBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  mentorBannerSubtitle: {
    fontSize: 11,
    color: theme.colors.text.body,
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.heading,
    marginBottom: 8,
    marginTop: 12,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.cardAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.body,
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: theme.colors.cardAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.text.heading,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.body,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    paddingVertical: 13,
    borderRadius: theme.radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...theme.shadows.glow,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardAlt,
  },
  priorityChipNormalActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  priorityChipHighActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  priorityChipUrgentActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  priorityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.body,
  },
  priorityChipTextActive: {
    fontWeight: '700',
    color: theme.colors.text.heading,
  },
  triageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderRadius: theme.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  triageNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#0369A1',
    lineHeight: 15,
  },
});
