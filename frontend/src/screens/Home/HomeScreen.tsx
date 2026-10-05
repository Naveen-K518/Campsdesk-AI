import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { SectionHeader } from '../../components/common/SectionHeader';
import { SuggestedPromptChips, PromptOption } from '../../components/chat/SuggestedPromptChips';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'HomeTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { student, queries, setPrefilledPrompt } = useQueryContext();
  const [showAllRecent, setShowAllRecent] = useState(false);

  // Compute stat values dynamically
  const pendingCount = queries.filter(
    (q) => q.status === 'under_review' || q.status === 'active' || q.status === 'live_agent_sync'
  ).length;
  const resolvedCount = queries.filter(
    (q) => q.status === 'resolved' || q.status === 'completed'
  ).length;
  const actionCount = queries.filter((q) => q.status === 'action_required').length;

  const recentQueries = showAllRecent ? queries.slice(0, 6) : queries.slice(0, 3);

  const handleSelectFrequentPrompt = (prompt: PromptOption) => {
    setPrefilledPrompt(prompt.fullPrompt);
    navigation.navigate('AskAITab', {
      prefilledPrompt: prompt.fullPrompt,
    });
  };

  const handleStartNewQuery = () => {
    navigation.navigate('AskAITab', {});
  };

  return (
    <View style={styles.container}>
      {/* Global Top Bar */}
      <GlobalTopBar
        onPressAvatar={() => navigation.navigate('ProfileTab')}
        onPressNotifications={() => navigation.navigate('Notifications')}
        onPressSearch={() => navigation.navigate('HistoryTab', {})}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting Card */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingHeader}>
            <View>
              <Text style={styles.greetingText}>
                Good morning, {student.name.split(' ')[0]} 👋
              </Text>
              <Text style={styles.rollSubtext}>
                Roll: {student.rollNo} • {student.year} {student.batch}
              </Text>
            </View>
            <View style={styles.versionBadge}>
              <View style={styles.greenDot} />
              <Text style={styles.versionText}>CampusDesk v4.2 Active</Text>
            </View>
          </View>
        </View>

        {/* Info Banner: EXAM ALERT */}
        <TouchableOpacity
          onPress={() => navigation.navigate('GuidelinesTab')}
          activeOpacity={0.88}
          style={styles.examBanner}
        >
          <View style={styles.bannerIconWrap}>
            <Text style={styles.megaphoneEmoji}>📢</Text>
          </View>
          <View style={styles.bannerTextWrap}>
            <View style={styles.bannerEyebrowRow}>
              <Text style={styles.bannerEyebrow}>EXAM ALERT</Text>
              <Text style={styles.bannerDate}>Starts Oct 15</Text>
            </View>
            <Text style={styles.bannerTitle}>
              Mid-term clearance check is now live. Complete required submissions.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>

        {/* 3-Column Stat Row */}
        <View style={styles.statsRow}>
          <StatCard
            value={pendingCount}
            label="Pending"
            subtext="1 with Faculty"
            dotColor={theme.colors.pending.dot}
          />
          <View style={styles.statGap} />
          <StatCard
            value={resolvedCount}
            label="Resolved"
            subtext="Avg 12m speed"
            dotColor={theme.colors.success.dot}
          />
          <View style={styles.statGap} />
          <StatCard
            value={actionCount}
            label="Action"
            subtext="Submit receipt"
            dotColor={theme.colors.primary}
          />
        </View>

        {/* Ask AI Anything Hero Card */}
        <LinearGradient
          colors={theme.colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, theme.shadows.glow]}
        >
          {/* Eyebrow + SLA */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroEyebrowPill}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
              <Text style={styles.heroEyebrowText}>AGENTIC INTELLIGENCE</Text>
            </View>
            <Text style={styles.slaBadge}>Active SLA: Instant</Text>
          </View>

          {/* Title & description */}
          <Text style={styles.heroTitle}>Ask AI Anything</Text>
          <Text style={styles.heroSubtitle}>
            Direct lookup on syllabus, fees, attendance exemptions, or faculty office hours.
          </Text>

          {/* Action Row */}
          <View style={styles.heroActionRow}>
            <TouchableOpacity
              onPress={handleStartNewQuery}
              activeOpacity={0.88}
              style={styles.newQueryPill}
            >
              <Text style={styles.newQueryText}>Start New Query ⊕</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPrefilledPrompt('Check attendance shortage condonation policy');
                navigation.navigate('AskAITab', {});
              }}
              activeOpacity={0.8}
              style={styles.micButton}
            >
              <Ionicons name="mic-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Frequent Section */}
        <View style={styles.sectionWrap}>
          <SectionHeader title="Frequent Actions" eyebrow="QUICK RESOLVE" />
          <SuggestedPromptChips onSelectPrompt={handleSelectFrequentPrompt} />
        </View>

        {/* Recent Inquiries Section */}
        <View style={styles.sectionWrap}>
          <SectionHeader
            title="Recent Inquiries"
            count={queries.length}
            viewAllText="View All"
            onViewAll={() => navigation.navigate('HistoryTab', {})}
          />

          {recentQueries.map((item) => (
            <QueryCard
              key={item.id}
              query={item}
              onPress={() => navigation.navigate('QueryDetail', { queryId: item.id })}
            />
          ))}

          {queries.length > 3 ? (
            <TouchableOpacity
              onPress={() => setShowAllRecent(!showAllRecent)}
              style={styles.viewMoreRow}
              activeOpacity={0.7}
            >
              <Text style={styles.viewMoreText}>
                {showAllRecent ? 'Show Less ▴' : `View ${queries.length - 3} More Inquiries ▾`}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Faculty Advisor Live Hours Card */}
        {student.facultyAdvisor ? (
          <View style={styles.advisorCard}>
            <View style={styles.advisorAvatar}>
              <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
            </View>
            <View style={styles.advisorInfo}>
              <View style={styles.advisorTopRow}>
                <Text style={styles.advisorTitle}>Faculty Advisor Live Hours</Text>
                <View style={styles.advisorActivePill}>
                  <View style={styles.advisorDot} />
                  <Text style={styles.advisorActiveText}>Office Open</Text>
                </View>
              </View>
              <Text style={styles.advisorName}>{student.facultyAdvisor.name}</Text>
              <Text style={styles.advisorLocation}>
                {student.facultyAdvisor.office} • {student.facultyAdvisor.hours}
              </Text>
            </View>
          </View>
        ) : null}
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
    paddingTop: 12,
    paddingBottom: 28,
  },
  greetingCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.sm,
  },
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  rollSubtext: {
    fontSize: 12,
    color: theme.colors.text.subtle,
    marginTop: 3,
    fontWeight: '500',
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  versionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  examBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: theme.radii.lg,
    padding: 12,
    marginBottom: 14,
  },
  bannerIconWrap: {
    marginRight: 10,
  },
  megaphoneEmoji: {
    fontSize: 22,
  },
  bannerTextWrap: {
    flex: 1,
    marginRight: 8,
  },
  bannerEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  bannerEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: 0.8,
    marginRight: 8,
  },
  bannerDate: {
    fontSize: 10,
    color: theme.colors.text.muted,
    fontWeight: '600',
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.heading,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statGap: {
    width: 8,
  },
  heroCard: {
    borderRadius: theme.radii.xl,
    padding: 20,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroEyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
    gap: 4,
  },
  heroEyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  slaBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E0E7FF',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 12.5,
    color: '#E0E7FF',
    lineHeight: 18,
    marginBottom: 18,
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newQueryPill: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.radii.full,
    marginRight: 10,
    ...theme.shadows.sm,
  },
  newQueryText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionWrap: {
    marginBottom: 12,
  },
  viewMoreRow: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginTop: 2,
    marginBottom: 8,
  },
  viewMoreText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  advisorCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    alignItems: 'center',
    ...theme.shadows.sm,
    marginTop: 6,
  },
  advisorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  advisorInfo: {
    flex: 1,
  },
  advisorTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  advisorTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  advisorActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: theme.radii.full,
  },
  advisorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  advisorActiveText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#059669',
  },
  advisorName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.text.heading,
  },
  advisorLocation: {
    fontSize: 11.5,
    color: theme.colors.text.subtle,
    marginTop: 1,
  },
});
