import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme/theme';
import { useQueryContext } from '../../context/QueryContext';
import { GlobalTopBar } from '../../components/common/GlobalTopBar';
import { PrimaryButton } from '../../components/common/PrimaryButton';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'GuidelinesTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const GuidelinesScreen: React.FC<Props> = ({ navigation }) => {
  const { guidelines, setPrefilledPrompt, refreshGuidelines } = useQueryContext();
  const [selectedCategory, setSelectedCategory] = useState('All Guidelines');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('g_02');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch freshest guidelines from API on mount
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        await refreshGuidelines();
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshGuidelines();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshGuidelines]);

  // Dynamically compute categories from API-published guidelines
  const categories = useMemo(() => {
    const base = [
      'All Guidelines',
      'Attendance & Leave',
      'Examination & Grading',
      'Hostel & Mess',
      'Placements & NOC',
      'Fee & Financial Aid',
    ];
    const liveCategories = guidelines.map((g) => g.category).filter(Boolean);
    return Array.from(new Set([...base, ...liveCategories]));
  }, [guidelines]);

  const featuredGuideline = guidelines.find((g) => g.mostConsulted) || guidelines[0];

  const filteredGuidelines = useMemo(() => {
    return guidelines.filter((g) => {
      // Category filter
      if (selectedCategory !== 'All Guidelines' && g.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (!searchQuery.trim()) return true;
      const lower = searchQuery.toLowerCase();
      return (
        g.title.toLowerCase().includes(lower) ||
        g.section.toLowerCase().includes(lower) ||
        g.body.toLowerCase().includes(lower) ||
        g.category.toLowerCase().includes(lower)
      );
    });
  }, [guidelines, selectedCategory, searchQuery]);

  const handleDraftQuery = (guidelineTitle: string, section: string) => {
    const prompt = `Can you verify my eligibility under ${section} (${guidelineTitle}) and draft an official docket for my department?`;
    setPrefilledPrompt(prompt);
    navigation.navigate('AskAITab', {
      prefilledPrompt: prompt,
      guidelineSection: section,
    });
  };

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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header Block */}
        <View style={styles.headerBlock}>
          <View style={styles.eyebrowBadge}>
            <Ionicons name="shield-checkmark" size={12} color={theme.colors.primary} />
            <Text style={styles.eyebrowText}>Official University Codex • Live API Sync</Text>
          </View>
          <Text style={styles.title}>University Guidelines & Policies</Text>
          <Text style={styles.subtitle}>
            Verified ordinances, attendance condonation rules, and examination statutes directly from the administrative database.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={theme.colors.text.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search guidelines (e.g., Sec 4.2 Attendance, Mess rebate, NOC)…"
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
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipActive,
              ]}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Policy Card */}
        {featuredGuideline && (!searchQuery || selectedCategory === 'All Guidelines' || selectedCategory === featuredGuideline.category) ? (
          <View style={styles.featuredCard}>
            {/* Badges */}
            <View style={styles.badgeRow}>
              <View style={styles.mostConsultedBadge}>
                <Text style={styles.mostConsultedText}>🔥 Most Consulted • {featuredGuideline.section}</Text>
              </View>
              <View style={styles.verifiedActiveBadge}>
                <Text style={styles.verifiedActiveText}>✅ AI Verified Active</Text>
              </View>
            </View>

            {/* Title & Body */}
            <Text style={styles.featuredTitle}>{featuredGuideline.title}</Text>
            <Text style={styles.featuredBody}>{featuredGuideline.body}</Text>

            {/* Mandatory Verification Criteria Checklist */}
            <View style={styles.criteriaBox}>
              <Text style={styles.criteriaHeading}>Mandatory Verification Criteria:</Text>
              {featuredGuideline.verificationCriteria.map((item, idx) => (
                <View key={idx} style={styles.criterionRow}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={styles.criterionText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* CTA to Ask AI */}
            <PrimaryButton
              title="✨ Draft AI Query with this Guideline"
              onPress={() => handleDraftQuery(featuredGuideline.title, featuredGuideline.section)}
              size="md"
              style={styles.featuredBtn}
            />
          </View>
        ) : null}

        {/* Decorative Enactment Archive Banner */}
        <View style={styles.senateBanner}>
          <Ionicons name="ribbon-outline" size={20} color="#FFFFFF" />
          <Text style={styles.senateBannerText}>
            Academic Senate Enactment Archive 2025 • Official Statutes
          </Text>
        </View>

        {/* Campus Statutes & Ordinances List */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Campus Statutes & Ordinances</Text>
          <View style={styles.articleBadge}>
            <Text style={styles.articleBadgeText}>{filteredGuidelines.length} ARTICLES</Text>
          </View>
        </View>

        <View style={styles.ordinancesList}>
          {filteredGuidelines.map((item) => {
            const isExpanded = expandedId === item.id;

            return (
              <View key={item.id} style={styles.ordinanceCard}>
                <TouchableOpacity
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  activeOpacity={0.8}
                  style={styles.ordinanceHeader}
                >
                  <View style={styles.ordinanceTopRow}>
                    <View style={styles.catPill}>
                      <Text style={styles.catPillText}>{item.category}</Text>
                    </View>
                    <Text style={styles.updatedText}>Updated: {item.lastUpdated}</Text>
                  </View>

                  <View style={styles.ordinanceTitleRow}>
                    <Text style={styles.ordinanceTitle}>
                      {item.section} • {item.title}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.colors.text.muted}
                    />
                  </View>

                  <Text style={styles.ordinanceSummary} numberOfLines={isExpanded ? undefined : 2}>
                    {item.body}
                  </Text>
                </TouchableOpacity>

                {isExpanded ? (
                  <View style={styles.expandedContent}>
                    <Text style={styles.criteriaTitle}>Verification Criteria:</Text>
                    {item.verificationCriteria.map((crit, idx) => (
                      <View key={idx} style={styles.expandedCritRow}>
                        <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} />
                        <Text style={styles.expandedCritText}>{crit}</Text>
                      </View>
                    ))}

                    <TouchableOpacity
                      onPress={() => handleDraftQuery(item.title, item.section)}
                      style={styles.draftQueryPill}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="sparkles" size={13} color={theme.colors.primary} />
                      <Text style={styles.draftQueryPillText}>
                        Draft AI Query for {item.section}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}

          {filteredGuidelines.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={44} color={theme.colors.text.muted} />
              <Text style={styles.emptyTitle}>No Guidelines Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No rules match "${searchQuery}". Try searching for attendance, leave, or exams.`
                  : `No published guidelines under "${selectedCategory}".`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom Help Card */}
        <View style={styles.helpCard}>
          <View style={styles.helpIconBox}>
            <Ionicons name="help-buoy" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.helpTitle}>Need help interpreting a university rule?</Text>
          <Text style={styles.helpBody}>
            Don't guess policies. The AI cross-references your student records directly with official Senate bylaws.
          </Text>
          <PrimaryButton
            title="🔎 Ask CampusDesk AI to verify your case against bylaws"
            onPress={() => handleDraftQuery('General Senate Bylaws', 'Codex 2025')}
            size="sm"
            style={styles.helpBtn}
          />
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
    marginBottom: 12,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 6,
  },
  eyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.text.heading,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    color: theme.colors.text.subtle,
    lineHeight: 18,
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
    marginVertical: 12,
    ...theme.shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text.heading,
    marginLeft: 8,
  },
  categoriesScroll: {
    paddingBottom: 14,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.radii.full,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.body,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  featuredCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.xl,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    ...theme.shadows.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  mostConsultedBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  mostConsultedText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#B45309',
  },
  verifiedActiveBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  verifiedActiveText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#059669',
  },
  featuredTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: 6,
  },
  featuredBody: {
    fontSize: 13,
    color: theme.colors.text.body,
    lineHeight: 19,
    marginBottom: 14,
  },
  criteriaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: theme.radii.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  criteriaHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  criterionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  criterionText: {
    fontSize: 12,
    color: theme.colors.text.body,
    flex: 1,
    lineHeight: 17,
    fontWeight: '500',
  },
  featuredBtn: {
    marginTop: 4,
  },
  senateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1B4B',
    borderRadius: theme.radii.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
    gap: 8,
  },
  senateBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E0E7FF',
    letterSpacing: 0.2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  articleBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  articleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  ordinancesList: {
    marginBottom: 16,
  },
  ordinanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.sm,
  },
  ordinanceHeader: {},
  ordinanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  catPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: theme.colors.text.subtle,
  },
  updatedText: {
    fontSize: 10.5,
    color: theme.colors.text.muted,
  },
  ordinanceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ordinanceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text.heading,
    flex: 1,
    marginRight: 6,
  },
  ordinanceSummary: {
    fontSize: 12,
    color: theme.colors.text.body,
    lineHeight: 17,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  criteriaTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.text.heading,
    marginBottom: 6,
  },
  expandedCritRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  expandedCritText: {
    fontSize: 12,
    color: theme.colors.text.subtle,
    flex: 1,
  },
  draftQueryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: theme.radii.full,
    paddingVertical: 8,
    marginTop: 10,
    gap: 6,
  },
  draftQueryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  helpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    alignItems: 'center',
    textAlign: 'center',
    ...theme.shadows.sm,
    marginBottom: 20,
  },
  helpIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: 6,
    textAlign: 'center',
  },
  helpBody: {
    fontSize: 12,
    color: theme.colors.text.subtle,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  helpBtn: {
    width: '100%',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.heading,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.text.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});
