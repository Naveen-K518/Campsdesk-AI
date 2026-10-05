import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { useQueryContext } from '../../context/QueryContext';

interface GlobalTopBarProps {
  onPressAvatar?: () => void;
  onPressNotifications?: () => void;
  onPressSearch?: () => void;
  termBadge?: string;
}

export const GlobalTopBar: React.FC<GlobalTopBarProps> = ({
  onPressAvatar,
  onPressNotifications,
  onPressSearch,
  termBadge = 'Fall 2025',
}) => {
  const insets = useSafeAreaInsets();
  const { student, unreadNotificationCount } = useQueryContext();

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.content}>
        {/* Left: Brand logo, wordmark, term badge */}
        <View style={styles.brandRow}>
          <View style={styles.logoTile}>
            <Ionicons name="school" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.nameBlock}>
            <View style={styles.titleRow}>
              <Text style={styles.appName}>CampusDesk</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            </View>
            <View style={styles.termPill}>
              <Text style={styles.termText}>{termBadge}</Text>
            </View>
          </View>
        </View>

        {/* Right: Search, Bell with badge, Avatar */}
        <View style={styles.actionsRow}>
          {onPressSearch ? (
            <TouchableOpacity
              onPress={onPressSearch}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Ionicons name="search-outline" size={20} color={theme.colors.text.body} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={onPressNotifications}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={21} color={theme.colors.text.heading} />
            {unreadNotificationCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onPressAvatar}
            style={styles.avatarContainer}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: student.avatarUrl }}
              style={styles.avatarImage}
            />
            <View style={styles.avatarOnlineDot} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    paddingHorizontal: 16,
    paddingBottom: 10,
    ...theme.shadows.sm,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoTile: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    ...theme.shadows.sm,
  },
  nameBlock: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.heading,
    letterSpacing: -0.3,
  },
  aiBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  termPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.radii.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  termText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.urgent.dot,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  avatarContainer: {
    marginLeft: 10,
    position: 'relative',
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
