import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface SectionHeaderProps {
  title: string;
  count?: number;
  viewAllText?: string;
  onViewAll?: () => void;
  eyebrow?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  count,
  viewAllText = 'View All',
  onViewAll,
  eyebrow,
}) => {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <View style={styles.row}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {count !== undefined ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          ) : null}
        </View>

        {onViewAll ? (
          <TouchableOpacity
            onPress={onViewAll}
            style={styles.linkButton}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>{viewAllText}</Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={theme.colors.primary}
              style={styles.chevron}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text.heading,
    letterSpacing: -0.2,
  },
  badge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  chevron: {
    marginLeft: 2,
  },
});
