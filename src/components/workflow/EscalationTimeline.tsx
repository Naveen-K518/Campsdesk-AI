import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

export interface EscalationStage {
  id: string;
  stageNumber: number;
  title: string;
  description: string;
  timestamp?: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  icon: keyof typeof Ionicons.glyphMap;
}

interface EscalationTimelineProps {
  stages?: EscalationStage[];
  tierBadge?: string;
}

const defaultStages: EscalationStage[] = [
  {
    id: 's1',
    stageNumber: 1,
    title: 'Query Submitted & AI Analyzed',
    description: 'Autonomous triage validated student record against Attendance Sec 4.2.',
    timestamp: 'Sep 2, 10:31 AM',
    status: 'completed',
    icon: 'checkmark-done',
  },
  {
    id: 's2',
    stageNumber: 2,
    title: 'Documents Verified by Agent',
    description: 'Medical discharge summary authenticated; doctor registration verified.',
    timestamp: 'Sep 2, 10:32 AM',
    status: 'completed',
    icon: 'shield-checkmark',
  },
  {
    id: 's3',
    stageNumber: 3,
    title: 'Escalated to Faculty Review',
    description: 'Routed to HOD CSE (Dr. K. Radhakrishnan) for executive endorsement.',
    timestamp: 'Sep 3, 04:15 PM',
    status: 'in_progress',
    icon: 'person',
  },
  {
    id: 's4',
    stageNumber: 4,
    title: 'Dean/Controller Sign-off & Resolution',
    description: 'Exam Cell Controller final hall ticket clearance ledger unlock.',
    timestamp: 'Expected within 24h',
    status: 'upcoming',
    icon: 'lock-closed',
  },
];

export const EscalationTimeline: React.FC<EscalationTimelineProps> = ({
  stages = defaultStages,
  tierBadge = 'TIER 2 ACTIVE',
}) => {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Escalation Pipeline</Text>
          <Text style={styles.subTitle}>Ordinance routing workflow</Text>
        </View>
        <View style={styles.tierPill}>
          <Text style={styles.tierPillText}>{tierBadge}</Text>
        </View>
      </View>

      {/* Stepper list */}
      <View style={styles.timelineList}>
        {stages.map((stage, index) => {
          const isLast = index === stages.length - 1;
          const isCompleted = stage.status === 'completed';
          const isInProgress = stage.status === 'in_progress';

          return (
            <View key={stage.id} style={styles.stageRow}>
              {/* Stepper Node & Line */}
              <View style={styles.stepperCol}>
                <View
                  style={[
                    styles.nodeCircle,
                    isCompleted && styles.nodeCompleted,
                    isInProgress && styles.nodeInProgress,
                    !isCompleted && !isInProgress && styles.nodeUpcoming,
                  ]}
                >
                  <Ionicons
                    name={isCompleted ? 'checkmark' : stage.icon}
                    size={14}
                    color={
                      isCompleted || isInProgress
                        ? '#FFFFFF'
                        : theme.colors.text.muted
                    }
                  />
                </View>
                {!isLast ? (
                  <View
                    style={[
                      styles.connectorLine,
                      isCompleted ? styles.connectorCompleted : styles.connectorUpcoming,
                    ]}
                  />
                ) : null}
              </View>

              {/* Stage Content */}
              <View style={styles.stageContent}>
                <View style={styles.stageHeaderRow}>
                  <Text
                    style={[
                      styles.stageTitle,
                      isInProgress && { color: theme.colors.primary },
                    ]}
                  >
                    {stage.title}
                  </Text>

                  <View
                    style={[
                      styles.statusTag,
                      isCompleted && styles.tagCompleted,
                      isInProgress && styles.tagInProgress,
                      !isCompleted && !isInProgress && styles.tagUpcoming,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        isCompleted && styles.tagTextCompleted,
                        isInProgress && styles.tagTextInProgress,
                        !isCompleted && !isInProgress && styles.tagTextUpcoming,
                      ]}
                    >
                      {isCompleted
                        ? 'Completed'
                        : isInProgress
                        ? 'In Progress'
                        : 'Upcoming'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.stageDesc}>{stage.description}</Text>
                {stage.timestamp ? (
                  <Text style={styles.timestamp}>{stage.timestamp}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
  },
  headerLeft: {},
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  subTitle: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  tierPill: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  tierPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  timelineList: {},
  stageRow: {
    flexDirection: 'row',
  },
  stepperCol: {
    alignItems: 'center',
    width: 28,
    marginRight: 10,
  },
  nodeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCompleted: {
    backgroundColor: '#4F46E5',
  },
  nodeInProgress: {
    backgroundColor: '#3B82F6',
  },
  nodeUpcoming: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 34,
    marginVertical: 4,
  },
  connectorCompleted: {
    backgroundColor: '#C7D2FE',
  },
  connectorUpcoming: {
    backgroundColor: '#E5E7EB',
  },
  stageContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  stageTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.text.heading,
    flex: 1,
    marginRight: 6,
  },
  statusTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radii.xs,
  },
  tagCompleted: {
    backgroundColor: '#F0FDF4',
  },
  tagInProgress: {
    backgroundColor: '#EFF6FF',
  },
  tagUpcoming: {
    backgroundColor: '#F9FAFB',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tagTextCompleted: {
    color: '#059669',
  },
  tagTextInProgress: {
    color: '#2563EB',
  },
  tagTextUpcoming: {
    color: theme.colors.text.muted,
  },
  stageDesc: {
    fontSize: 12,
    color: theme.colors.text.body,
    lineHeight: 16,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 4,
    fontWeight: '500',
  },
});
