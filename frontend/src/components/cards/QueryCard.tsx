import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { Query } from '../../types';
import { StatusChip } from '../common/StatusChip';

interface QueryCardProps {
  query: Query;
  onPress: () => void;
  dense?: boolean;
}

export const QueryCard: React.FC<QueryCardProps> = ({ query, onPress, dense = false }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.card, dense && styles.cardDense]}
    >
      {/* Top row: Code + Category Pill on Left, StatusChip on Right */}
      <View style={styles.topRow}>
        <View style={styles.codeCategoryRow}>
          <Text style={styles.codeText}>{query.code}</Text>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {query.category}
            </Text>
          </View>
        </View>
        <StatusChip status={query.status} />
      </View>

      {/* Middle row: Title + subline */}
      <View style={styles.middleBlock}>
        <Text style={[styles.title, dense && styles.titleDense]} numberOfLines={2}>
          {query.title}
        </Text>
        {query.subLine || query.description ? (
          <Text style={styles.subLine} numberOfLines={1}>
            {query.subLine || query.description}
          </Text>
        ) : null}
      </View>

      {/* Bottom row: Assignee / AI Triage info + Chevron */}
      <View style={styles.footerRow}>
        <View style={styles.assigneeBlock}>
          <View style={styles.assigneeIconBox}>
            {query.aiConfidence && query.status === 'resolved' ? (
              <Ionicons name="sparkles" size={13} color="#6366F1" />
            ) : query.assignedTo?.includes('HOD') || query.assignedTo?.includes('Dr.') ? (
              <Ionicons name="person" size={13} color={theme.colors.primary} />
            ) : (
              <Ionicons name="shield-checkmark" size={13} color={theme.colors.text.subtle} />
            )}
          </View>

          <Text style={styles.assigneeText} numberOfLines={1}>
            {query.citation
              ? query.citation
              : query.assignedTo
              ? query.assignedTo
              : `Autonomous AI Triage (${query.aiConfidence || 98}%)`}
          </Text>
        </View>

        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.text.muted} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.sm,
  },
  cardDense: {
    padding: 14,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.2,
    marginRight: 8,
  },
  categoryPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: theme.radii.full,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.subtle,
  },
  middleBlock: {
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.heading,
    lineHeight: 21,
    marginBottom: 4,
  },
  titleDense: {
    fontSize: 14,
    lineHeight: 19,
  },
  subLine: {
    fontSize: 12,
    color: theme.colors.text.muted,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSubtle,
  },
  assigneeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  assigneeIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F4F5FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  assigneeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: theme.colors.text.subtle,
    flex: 1,
  },
  chevronWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
