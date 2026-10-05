import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme/theme';
import { useQueryContext } from '../../context/QueryContext';
import { GlobalTopBar } from '../../components/common/GlobalTopBar';
import { StatCard } from '../../components/common/StatCard';
import { QueryCard } from '../../components/cards/QueryCard';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'HistoryTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

type SegmentType = 'all' | 'active' | 'resolved';

export const HistoryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { queries } = useQueryContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegment, setActiveSegment] = useState<SegmentType>('all');

  // Compute stat values
  const activeCount = queries.filter(
    (q) => q.status === 'active' || q.status === 'under_review' || q.status === 'action_required' || q.status === 'live_agent_sync'
  ).length;

  const resolvedCount = queries.filter(
    (q) => q.status === 'resolved' || q.status === 'completed'
  ).length;

  // Filter queries based on search query and segmented control
  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      // Segment filter
      if (activeSegment === 'active') {
        if (q.status === 'resolved' || q.status === 'completed') return false;
      } else if (activeSegment === 'resolved') {
        if (q.status !== 'resolved' && q.status !== 'completed') return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const lower = searchQuery.toLowerCase();
      return (
        q.title.toLowerCase().includes(lower) ||
        q.code.toLowerCase().includes(lower) ||
        q.category.toLowerCase().includes(lower) ||
        (q.description && q.description.toLowerCase().includes(lower))
      );
    });
  }, [queries, activeSegment, searchQuery]);

  return (
    <View style={styles.container}>
      <GlobalTopBar
        onPressAvatar={() => navigation.navigate('ProfileTab')}
        onPressNotifications={() => navigation.navigate('Notifications')}
        onPressSearch={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <View style={styles.headerTitleRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>Query History</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{queries.length}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => {
                // Cycle segments quickly as filter
                setActiveSegment(
                  activeSegment === 'all'
                    ? 'active'
                    : activeSegment === 'active'
                    ? 'resolved'
                    : 'all'
                );
              }}
              style={styles.filterBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="funnel-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.filterText}>Filter</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subTitle}>
            Track your academic, hostel, and administrative requests
          </Text>
        </View>

        {/* 3-Column Stat Row */}
        <View style={styles.statsRow}>
          <StatCard
            value={activeCount}
            label="Active"
            subtext="In pipeline"
            dotColor={theme.colors.info.dot}
          />
          <View style={styles.statGap} />
          <StatCard
            value={resolvedCount}
            label="Resolved"
            subtext="Approved & closed"
            dotColor={theme.colors.success.dot}
          />
          <View style={styles.statGap} />
          <StatCard
            value="18m"
            label="Avg Time"
            subtext="AI turnaround"
            dotColor={theme.colors.aiResolved.dot}
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={theme.colors.text.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search queries by title, ID (#CS-4921), …"
            placeholderTextColor={theme.colors.text.muted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.text.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Segmented Control */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            onPress={() => setActiveSegment('all')}
            style={[styles.segmentBtn, activeSegment === 'all' && styles.segmentActive]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'all' && styles.segmentTextActive,
              ]}
            >
              All ({queries.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSegment('active')}
            style={[styles.segmentBtn, activeSegment === 'active' && styles.segmentActive]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'active' && styles.segmentTextActive,
              ]}
            >
              Active ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveSegment('resolved')}
            style={[styles.segmentBtn, activeSegment === 'resolved' && styles.segmentActive]}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                activeSegment === 'resolved' && styles.segmentTextActive,
              ]}
            >
              Resolved ({resolvedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* List of Query Cards */}
        <View style={styles.listContainer}>
          {filteredQueries.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={36} color={theme.colors.text.muted} />
              <Text style={styles.emptyTitle}>No matching queries</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or segment filters.
              </Text>
            </View>
          ) : (
            filteredQueries.map((query) => (
              <QueryCard
                key={query.id}
                query={query}
                dense
                onPress={() => navigation.navigate('QueryDetail', { queryId: query.id })}
              />
            ))
          )}
        </View>

        {/* Footer Promo Card */}
        <View style={styles.archiveCard}>
          <View style={styles.archiveIconWrap}>
            <Ionicons name="archive-outline" size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.archiveInfo}>
            <Text style={styles.archiveTitle}>Academic Year 2023-24 Archive</Text>
            <Text style={styles.archiveSubtitle}>
              Access completed records and past Senate decisions.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSearchQuery('2024')}
            style={styles.browseBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.browseBtnText}>Browse</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  headerBlock: {
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.text.heading,
  },
  countBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  subTitle: {
    fontSize: 12.5,
    color: theme.colors.text.subtle,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    gap: 4,
    ...theme.shadows.sm,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  statGap: {
    width: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.heading,
    marginLeft: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: theme.radii.md,
    padding: 3,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.sm,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    ...theme.shadows.sm,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.muted,
  },
  segmentTextActive: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  listContainer: {
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.heading,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  archiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    ...theme.shadows.sm,
  },
  archiveIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  archiveInfo: {
    flex: 1,
  },
  archiveTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  archiveSubtitle: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  browseBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  browseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
