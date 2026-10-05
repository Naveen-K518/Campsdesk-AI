import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { WorkflowStep } from '../../types';

interface WorkflowStepListProps {
  steps: WorkflowStep[];
  title?: string;
  caption?: string;
  defaultExpanded?: boolean;
}

export const WorkflowStepList: React.FC<WorkflowStepListProps> = ({
  steps,
  title = 'Agentic Workflow Execution',
  caption = 'Auto-derived from SIS + Bylaws Sec 4.2',
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.card}>
      {/* Header with collapse toggle */}
      <TouchableOpacity
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="git-network-outline" size={16} color={theme.colors.primary} />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{title}</Text>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{steps.length} STEPS</Text>
              </View>
            </View>
            <Text style={styles.caption}>{caption}</Text>
          </View>
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.text.muted}
        />
      </TouchableOpacity>

      {/* Expanded list of steps */}
      {expanded ? (
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            const isDone = step.status === 'done';
            const isInProgress = step.status === 'in_progress';

            return (
              <View key={step.id} style={styles.stepRow}>
                {/* Left indicator + connecting vertical line */}
                <View style={styles.leftColumn}>
                  <View
                    style={[
                      styles.indicatorCircle,
                      isDone && styles.circleDone,
                      isInProgress && styles.circleInProgress,
                      !isDone && !isInProgress && styles.circleLocked,
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    ) : isInProgress ? (
                      <Ionicons name="sync" size={12} color="#FFFFFF" />
                    ) : (
                      <Ionicons name="lock-closed" size={11} color={theme.colors.text.muted} />
                    )}
                  </View>
                  {!isLast ? (
                    <View
                      style={[
                        styles.connectorLine,
                        isDone ? styles.lineDone : styles.linePending,
                      ]}
                    />
                  ) : null}
                </View>

                {/* Right content */}
                <View style={styles.rightContent}>
                  <View style={styles.stepTitleRow}>
                    <Text
                      style={[
                        styles.stepLabel,
                        isInProgress && { color: theme.colors.primary },
                      ]}
                    >
                      {step.label}
                    </Text>
                    {step.timestamp ? (
                      <Text style={styles.timestamp}>{step.timestamp}</Text>
                    ) : null}
                  </View>

                  <Text style={styles.stepDetail}>{step.detail}</Text>

                  {step.highlightKey && step.highlightValue ? (
                    <View style={styles.highlightPill}>
                      <Text style={styles.highlightKey}>{step.highlightKey}: </Text>
                      <Text style={styles.highlightVal}>{step.highlightValue}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  stepBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.radii.full,
    marginLeft: 6,
  },
  stepBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 11,
    color: theme.colors.text.subtle,
    marginTop: 2,
  },
  stepsContainer: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  leftColumn: {
    alignItems: 'center',
    width: 26,
    marginRight: 10,
  },
  indicatorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: '#10B981',
  },
  circleInProgress: {
    backgroundColor: theme.colors.primary,
  },
  circleLocked: {
    backgroundColor: '#E5E7EB',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    marginVertical: 3,
  },
  lineDone: {
    backgroundColor: '#A7F3D0',
  },
  linePending: {
    backgroundColor: '#E5E7EB',
  },
  rightContent: {
    flex: 1,
    paddingBottom: 12,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.heading,
  },
  timestamp: {
    fontSize: 10.5,
    color: theme.colors.text.muted,
  },
  stepDetail: {
    fontSize: 12,
    color: theme.colors.text.body,
    lineHeight: 17,
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: '#E0E7FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.xs,
    marginTop: 6,
  },
  highlightKey: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.subtle,
  },
  highlightVal: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
  },
});
