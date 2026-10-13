import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme/theme';
import { useQueryContext } from '../../context/QueryContext';
import * as api from '../../services/api';
import { ResourceItem, TimetableEntry } from '../../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TimetableNotices'>;

type FilterCategory = 'all' | 'timetable' | 'calendar' | 'circular' | 'rules';

const CATEGORY_TABS: { key: FilterCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All Notices', icon: 'layers-outline' },
  { key: 'timetable', label: 'Timetables', icon: 'calendar-outline' },
  { key: 'calendar', label: 'Academic Calendar', icon: 'calendar-number-outline' },
  { key: 'circular', label: 'Circulars', icon: 'megaphone-outline' },
  { key: 'rules', label: 'Bylaws & Rules', icon: 'book-outline' },
];

export const TimetableNoticesScreen: React.FC<Props> = ({ navigation }) => {
  const { student, setPrefilledPrompt } = useQueryContext();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [selectedTimetableDay, setSelectedTimetableDay] = useState<string>('Monday');
  const [expandedTimetableIds, setExpandedTimetableIds] = useState<Record<string, boolean>>({});

  const loadResources = useCallback(async () => {
    try {
      const data = await api.getResources();
      setResources(data || []);
      // Auto-expand first timetable if present
      const firstTt = data.find((d) => d.category === 'timetable');
      if (firstTt) {
        setExpandedTimetableIds((prev) => ({ ...prev, [firstTt.id]: true }));
      }
    } catch (err: any) {
      console.warn('[TimetableNotices] Error loading resources:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadResources();
  }, [loadResources]);

  const handleOpenFile = async (fileUrl?: string, title?: string) => {
    if (!fileUrl) {
      Alert.alert('No Document Attached', 'This notice does not have an attached downloadable file.');
      return;
    }

    const fullUrl = api.getFileUrl(fileUrl);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(fullUrl, '_blank');
      } else {
        const canOpen = await Linking.canOpenURL(fullUrl);
        if (canOpen) {
          await Linking.openURL(fullUrl);
        } else {
          Alert.alert('Download Error', `Could not open file URL: ${fullUrl}`);
        }
      }
    } catch (err: any) {
      console.error('Error opening file:', err);
      Alert.alert('Error', 'Unable to open or download the document.');
    }
  };

  const toggleTimetableExpand = (id: string) => {
    setExpandedTimetableIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter resources based on category and search query
  const filteredResources = useMemo(() => {
    return resources.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      const matchDept = (item.department || '').toLowerCase().includes(q);
      const matchYear = (item.academic_year || '').toLowerCase().includes(q);
      const matchEntries = item.timetableEntries?.some(
        (e) =>
          e.subject.toLowerCase().includes(q) ||
          (e.faculty || '').toLowerCase().includes(q) ||
          (e.room || '').toLowerCase().includes(q)
      );

      return matchTitle || matchDesc || matchDept || matchYear || matchEntries;
    });
  }, [resources, selectedCategory, searchQuery]);

  // Helper badge styles for resource categories
  const getCategoryMeta = (category: string) => {
    switch (category) {
      case 'timetable':
        return {
          label: 'Class Timetable',
          bg: '#EEF2FF',
          border: '#C7D2FE',
          color: '#4F46E5',
          icon: 'calendar' as const,
        };
      case 'calendar':
        return {
          label: 'Academic Calendar',
          bg: '#ECFDF5',
          border: '#A7F3D0',
          color: '#059669',
          icon: 'calendar-number' as const,
        };
      case 'circular':
        return {
          label: 'Official Circular',
          bg: '#FFFBEB',
          border: '#FDE68A',
          color: '#D97706',
          icon: 'megaphone' as const,
        };
      case 'rules':
        return {
          label: 'Statute / Bylaw',
          bg: '#FAF5FF',
          border: '#E9D5FF',
          color: '#7C3AED',
          icon: 'shield-checkmark' as const,
        };
      default:
        return {
          label: 'Notice Document',
          bg: '#F3F4F6',
          border: '#E5E7EB',
          color: '#4B5563',
          icon: 'document-text' as const,
        };
    }
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text.heading} />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Timetable & Notices</Text>
          <Text style={styles.headerSubtitle}>Published academic schedules & circulars</Text>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshIconButton}
          activeOpacity={0.7}
        >
          <Ionicons name="reload-outline" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Student Profile Personalization Banner */}
        <View style={styles.studentContextCard}>
          <View style={styles.contextLeft}>
            <View style={styles.contextIconWrap}>
              <Ionicons name="school-outline" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.contextInfo}>
              <Text style={styles.contextName}>{student.name}</Text>
              <Text style={styles.contextMeta}>
                {student.department || 'Computing Sciences'} • {student.year || '1st Year'}
              </Text>
            </View>
          </View>
          <View style={styles.activeFilterPill}>
            <Ionicons name="checkmark-circle" size={12} color="#059669" />
            <Text style={styles.activeFilterText}>Filtered for you</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={theme.colors.text.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search timetables, subjects, faculty, or circulars…"
            placeholderTextColor={theme.colors.text.muted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.colors.text.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Category Horizontal Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {CATEGORY_TABS.map((tab) => {
            const isActive = selectedCategory === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSelectedCategory(tab.key)}
                style={[styles.tabChip, isActive && styles.tabChipActive]}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#FFFFFF' : theme.colors.text.subtle}
                />
                <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Main List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Fetching published notices & timetables…</Text>
          </View>
        ) : filteredResources.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={48} color={theme.colors.text.muted} />
            <Text style={styles.emptyTitle}>No Published Documents Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No results matched "${searchQuery}". Try a different keyword.`
                : 'There are no published circulars or timetables under this category yet.'}
            </Text>
          </View>
        ) : (
          <View style={styles.resourceList}>
            {filteredResources.map((item) => {
              const meta = getCategoryMeta(item.category);
              const isTimetable = item.category === 'timetable';
              const hasEntries = Boolean(item.timetableEntries && item.timetableEntries.length > 0);
              const isExpanded = Boolean(expandedTimetableIds[item.id]);

              // Filter timetable entries for selected day
              const dayEntries = (item.timetableEntries || []).filter(
                (e) => e.day.toLowerCase() === selectedTimetableDay.toLowerCase()
              );

              return (
                <View key={item.id} style={styles.resourceCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: meta.bg, borderColor: meta.border },
                      ]}
                    >
                      <Ionicons name={meta.icon} size={12} color={meta.color} />
                      <Text style={[styles.categoryBadgeText, { color: meta.color }]}>
                        {meta.label}
                      </Text>
                    </View>

                    <View style={styles.versionBadge}>
                      <Text style={styles.versionBadgeText}>v{item.version || 1}</Text>
                    </View>
                  </View>

                  {/* Title & Description */}
                  <Text style={styles.resourceTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.resourceDescription}>{item.description}</Text>
                  ) : null}

                  {/* Metadata Tags */}
                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="business-outline" size={12} color={theme.colors.text.subtle} />
                      <Text style={styles.metaChipText}>
                        {item.department || 'All Departments'}
                      </Text>
                    </View>

                    <View style={styles.metaChip}>
                      <Ionicons name="calendar-outline" size={12} color={theme.colors.text.subtle} />
                      <Text style={styles.metaChipText}>
                        {item.academic_year || 'All Years'}
                      </Text>
                    </View>

                    {item.effective_date ? (
                      <View style={styles.metaChip}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.text.subtle} />
                        <Text style={styles.metaChipText}>
                          Effective: {item.effective_date}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Timetable Interactive Grid Breakdown */}
                  {isTimetable && hasEntries ? (
                    <View style={styles.timetableSection}>
                      <TouchableOpacity
                        onPress={() => toggleTimetableExpand(item.id)}
                        style={styles.timetableToggleBar}
                        activeOpacity={0.8}
                      >
                        <View style={styles.timetableToggleLeft}>
                          <Ionicons name="grid-outline" size={16} color={theme.colors.primary} />
                          <Text style={styles.timetableToggleTitle}>
                            Interactive Class Schedule ({item.timetableEntries?.length} Periods)
                          </Text>
                        </View>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={theme.colors.primary}
                        />
                      </TouchableOpacity>

                      {isExpanded ? (
                        <View style={styles.timetableScheduleWrap}>
                          {/* Day selector tabs */}
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.daySelectorScroll}
                          >
                            {DAYS.map((day) => {
                              const isDayActive =
                                selectedTimetableDay.toLowerCase() === day.toLowerCase();
                              return (
                                <TouchableOpacity
                                  key={day}
                                  onPress={() => setSelectedTimetableDay(day)}
                                  style={[
                                    styles.dayTabPill,
                                    isDayActive && styles.dayTabPillActive,
                                  ]}
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={[
                                      styles.dayTabText,
                                      isDayActive && styles.dayTabTextActive,
                                    ]}
                                  >
                                    {day}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>

                          {/* Day's period entries */}
                          {dayEntries.length === 0 ? (
                            <View style={styles.noDayEntriesBox}>
                              <Ionicons name="sunny-outline" size={24} color={theme.colors.text.muted} />
                              <Text style={styles.noDayEntriesText}>
                                No lectures scheduled on {selectedTimetableDay}.
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.periodsList}>
                              {dayEntries.map((entry, idx) => (
                                <View key={entry.id || idx} style={styles.periodRow}>
                                  <View style={styles.periodBadge}>
                                    <Text style={styles.periodNumber}>P{entry.period}</Text>
                                  </View>

                                  <View style={styles.periodDetails}>
                                    <Text style={styles.periodSubject}>{entry.subject}</Text>
                                    <View style={styles.periodSubRow}>
                                      {entry.faculty ? (
                                        <View style={styles.periodSubItem}>
                                          <Ionicons
                                            name="person-outline"
                                            size={12}
                                            color={theme.colors.text.subtle}
                                          />
                                          <Text style={styles.periodSubText}>{entry.faculty}</Text>
                                        </View>
                                      ) : null}

                                      {entry.room ? (
                                        <View style={styles.periodSubItem}>
                                          <Ionicons
                                            name="location-outline"
                                            size={12}
                                            color={theme.colors.primary}
                                          />
                                          <Text
                                            style={[
                                              styles.periodSubText,
                                              { color: theme.colors.primary, fontWeight: '600' },
                                            ]}
                                          >
                                            {entry.room}
                                          </Text>
                                        </View>
                                      ) : null}
                                    </View>
                                  </View>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Actions Row */}
                  <View style={styles.cardActionsRow}>
                    {item.file_url ? (
                      <TouchableOpacity
                        onPress={() => handleOpenFile(item.file_url, item.title)}
                        style={styles.openFileButton}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.openFileText}>Open / Download Document</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.inAppOnlyPill}>
                        <Ionicons name="checkmark-done" size={14} color="#059669" />
                        <Text style={styles.inAppOnlyText}>Digital In-App Notice</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => {
                        const prompt = `Can you clarify the policy or schedule details for "${item.title}"?`;
                        setPrefilledPrompt(prompt);
                        navigation.navigate('Main', {
                          screen: 'AskAITab',
                          params: {
                            prefilledPrompt: prompt,
                          },
                        });
                      }}
                      style={styles.askAiButton}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="sparkles" size={14} color={theme.colors.primary} />
                      <Text style={styles.askAiButtonText}>Ask AI</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  refreshIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
  },
  studentContextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    ...theme.shadows.sm,
  },
  contextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  contextIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextInfo: {
    flex: 1,
  },
  contextName: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text.heading,
  },
  contextMeta: {
    fontSize: 11,
    color: theme.colors.text.subtle,
    marginTop: 1,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  activeFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.heading,
  },
  tabScroll: {
    paddingBottom: 14,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  tabChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.body,
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: theme.colors.text.muted,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.heading,
    marginTop: 14,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  resourceList: {
    gap: 14,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...theme.shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    gap: 5,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  versionBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radii.xs,
  },
  versionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.subtle,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.heading,
    lineHeight: 22,
    marginBottom: 6,
  },
  resourceDescription: {
    fontSize: 13,
    color: theme.colors.text.body,
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.xs,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  metaChipText: {
    fontSize: 11,
    color: theme.colors.text.subtle,
    fontWeight: '500',
  },
  timetableSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 14,
  },
  timetableToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  timetableToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timetableToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  timetableScheduleWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  },
  daySelectorScroll: {
    gap: 6,
    paddingBottom: 8,
  },
  dayTabPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dayTabPillActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  dayTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.subtle,
  },
  dayTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  noDayEntriesBox: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  noDayEntriesText: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  periodsList: {
    gap: 6,
    marginTop: 4,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  periodBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  periodDetails: {
    flex: 1,
  },
  periodSubject: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.heading,
  },
  periodSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  periodSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  periodSubText: {
    fontSize: 11,
    color: theme.colors.text.subtle,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  openFileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radii.md,
    gap: 6,
    ...theme.shadows.sm,
  },
  openFileText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inAppOnlyPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 6,
  },
  inAppOnlyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  askAiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: theme.colors.primaryBorder,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radii.md,
    gap: 6,
  },
  askAiButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
