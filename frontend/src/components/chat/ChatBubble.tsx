import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { ChatMessage } from '../../types';
import { WorkflowStepList } from '../workflow/WorkflowStepList';

interface ChatBubbleProps {
  message: ChatMessage;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isStudent = message.sender === 'student';
  const isFaculty = message.sender === 'faculty';

  if (isStudent) {
    return (
      <View style={styles.studentWrapper}>
        <LinearGradient
          colors={theme.colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.studentBubble, theme.shadows.sm]}
        >
          <Text style={styles.studentText}>{message.text}</Text>
          <Text style={styles.studentTimestamp}>{message.timestamp}</Text>
        </LinearGradient>
      </View>
    );
  }

  // Agent or Faculty Bubble
  return (
    <View style={styles.agentWrapper}>
      {/* Sender Avatar */}
      <View style={[styles.avatar, isFaculty && styles.facultyAvatar]}>
        <Ionicons
          name={isFaculty ? 'person' : 'sparkles'}
          size={14}
          color="#FFFFFF"
        />
      </View>

      <View style={styles.agentContent}>
        {/* Author & Tag */}
        <View style={styles.agentHeader}>
          <Text style={styles.authorName}>
            {isFaculty ? 'Faculty Advisor' : 'CampusDesk Agentic AI'}
          </Text>
          {message.tag ? (
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{message.tag}</Text>
            </View>
          ) : null}
          <Text style={styles.timestamp}>{message.timestamp}</Text>
        </View>

        {/* Bubble Box */}
        <View style={[styles.agentBubble, theme.shadows.sm]}>
          <Text style={styles.agentText}>{message.text}</Text>

          {/* Optional Verified Policy Badge */}
          {message.verifiedPolicy ? (
            <View style={styles.policyCard}>
              <View style={styles.policyHeader}>
                <Ionicons name="shield-checkmark" size={14} color="#059669" />
                <Text style={styles.policyCode}>{message.verifiedPolicy.code}</Text>
                <Text style={styles.policyTitle}>{message.verifiedPolicy.title}</Text>
              </View>
              <Text style={styles.policyCaseId}>
                Registered Case ID: {message.verifiedPolicy.caseId}
              </Text>
            </View>
          ) : null}

          {/* Workflow Execution Stepper embedded if present */}
          {message.workflowExecution && message.workflowExecution.length > 0 ? (
            <WorkflowStepList steps={message.workflowExecution} />
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  studentWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 6,
    paddingLeft: 48,
  },
  studentBubble: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '85%',
  },
  studentText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    fontWeight: '500',
  },
  studentTimestamp: {
    fontSize: 10,
    color: '#E0E7FF',
    textAlign: 'right',
    marginTop: 4,
  },
  agentWrapper: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingRight: 32,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  facultyAvatar: {
    backgroundColor: '#059669',
  },
  agentContent: {
    flex: 1,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.heading,
    marginRight: 6,
  },
  tagBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.radii.full,
    marginRight: 6,
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  timestamp: {
    fontSize: 10,
    color: theme.colors.text.muted,
  },
  agentBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  agentText: {
    fontSize: 13.5,
    color: theme.colors.text.heading,
    lineHeight: 20,
  },
  policyCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: theme.radii.sm,
    padding: 10,
    marginTop: 10,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  policyCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 4,
    marginRight: 6,
  },
  policyTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
    flex: 1,
  },
  policyCaseId: {
    fontSize: 10,
    color: '#047857',
    marginTop: 2,
    fontWeight: '500',
  },
});
