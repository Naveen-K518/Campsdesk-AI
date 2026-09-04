import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import { QueryStatus, PriorityLevel } from '../../types';

interface StatusChipProps {
  status?: QueryStatus | PriorityLevel | 'ai_resolved' | 'live_sync' | 'urgent' | 'pending';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label, size = 'sm' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'resolved':
      case 'completed':
        return {
          bg: theme.colors.success.bg,
          border: theme.colors.success.border,
          text: theme.colors.success.text,
          dot: theme.colors.success.dot,
          defaultLabel: status === 'resolved' ? 'Resolved' : 'Completed',
        };
      case 'urgent':
        return {
          bg: theme.colors.urgent.bg,
          border: theme.colors.urgent.border,
          text: theme.colors.urgent.text,
          dot: theme.colors.urgent.dot,
          defaultLabel: 'Urgent',
        };
      case 'action_required':
      case 'pending':
        return {
          bg: theme.colors.pending.bg,
          border: theme.colors.pending.border,
          text: theme.colors.pending.text,
          dot: theme.colors.pending.dot,
          defaultLabel: status === 'action_required' ? 'Action Required' : 'Pending',
        };
      case 'under_review':
        return {
          bg: '#F5F3FF',
          border: '#DDD6FE',
          text: '#7C3AED',
          dot: '#7C3AED',
          defaultLabel: 'Under Review',
        };
      case 'ai_resolved':
        return {
          bg: theme.colors.aiResolved.bg,
          border: theme.colors.aiResolved.border,
          text: theme.colors.aiResolved.text,
          dot: theme.colors.aiResolved.dot,
          defaultLabel: 'AI Resolved',
        };
      case 'live_agent_sync':
      case 'live_sync':
        return {
          bg: theme.colors.liveSync.bg,
          border: theme.colors.liveSync.border,
          text: theme.colors.liveSync.text,
          dot: theme.colors.liveSync.dot,
          defaultLabel: 'Live Agent Sync',
        };
      case 'high':
        return {
          bg: '#FEF3C7',
          border: '#FDE68A',
          text: '#B45309',
          dot: '#B45309',
          defaultLabel: 'High Priority',
        };
      case 'active':
      default:
        return {
          bg: theme.colors.info.bg,
          border: theme.colors.info.border,
          text: theme.colors.info.text,
          dot: theme.colors.info.dot,
          defaultLabel: 'Active',
        };
    }
  };

  const config = getStatusConfig();
  const displayLabel = label || config.defaultLabel;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 12,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: isSmall ? 11 : 12,
          },
        ]}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
