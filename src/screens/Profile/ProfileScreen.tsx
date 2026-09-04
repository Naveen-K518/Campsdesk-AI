import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme/theme';
import { useQueryContext } from '../../context/QueryContext';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'ProfileTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { student, logout } = useQueryContext();
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handleCopy = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopyToast(`Copied ${label} to clipboard!`);
      setTimeout(() => setCopyToast(null), 2000);
    } catch (err) {
      Alert.alert('Copied', text);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of CampusDesk AI?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text.heading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Student Profile</Text>
        <View style={styles.activePill}>
          <Text style={styles.activePillText}>⚙ Active</Text>
        </View>
      </View>

      {/* Copy Toast banner */}
      {copyToast ? (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#059669" />
          <Text style={styles.toastText}>{copyToast}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Centered Avatar and Name Block */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: student.avatarUrl }} style={styles.avatarImage} />
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.degreeLine}>{student.program}</Text>
          <Text style={styles.deptLine}>{student.department}</Text>
        </View>

        {/* Academic Performance Quick Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{student.cgpa || 8.92}</Text>
            <Text style={styles.metricLabel}>CGPA</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{student.attendanceAggregate || 88.4}%</Text>
            <Text style={styles.metricLabel}>Attendance</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricVal}>{student.credits || 118}</Text>
            <Text style={styles.metricLabel}>Credits Earned</Text>
          </View>
        </View>

        {/* About Section Header */}
        <View style={styles.sectionHeaderWrap}>
          <Text style={styles.sectionHeaderTitle}>About</Text>
          <Text style={styles.sectionHeaderSub}>Your profile and contact details</Text>
        </View>

        {/* 2-Column Grid of Info Cards */}
        <View style={styles.infoGrid}>
          {/* Roll Number (copyable) */}
          <TouchableOpacity
            onPress={() => handleCopy(student.rollNo, 'Roll Number')}
            style={styles.gridCard}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconBox}>
              <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Roll Number</Text>
              <Text style={styles.cardValue}>{student.rollNo}</Text>
            </View>
            <Ionicons name="copy-outline" size={16} color={theme.colors.text.muted} />
          </TouchableOpacity>

          {/* Designation */}
          <View style={styles.gridCard}>
            <View style={styles.cardIconBox}>
              <Ionicons name="ribbon-outline" size={18} color="#059669" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Designation</Text>
              <Text style={styles.cardValue}>Undergrad</Text>
            </View>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>Full-Time</Text>
            </View>
          </View>

          {/* Role */}
          <View style={styles.gridCard}>
            <View style={styles.cardIconBox}>
              <Ionicons name="person-outline" size={18} color="#3B82F6" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Role</Text>
              <Text style={styles.cardValue}>Student Member</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.text.muted} />
          </View>

          {/* Batch */}
          <View style={styles.gridCard}>
            <View style={styles.cardIconBox}>
              <Ionicons name="calendar-outline" size={18} color="#D97706" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Batch & Term</Text>
              <Text style={styles.cardValue}>{student.batch}</Text>
            </View>
            <View style={styles.badgePillAmber}>
              <Text style={styles.badgePillTextAmber}>Fall '25</Text>
            </View>
          </View>

          {/* Mobile */}
          <TouchableOpacity
            onPress={() => Alert.alert('Contact Action', `Call ${student.mobile}?`)}
            style={styles.gridCard}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconBox}>
              <Ionicons name="call-outline" size={18} color="#8B5CF6" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Mobile Phone</Text>
              <Text style={styles.cardValue}>{student.mobile}</Text>
            </View>
            <Ionicons name="call" size={14} color={theme.colors.text.muted} />
          </TouchableOpacity>

          {/* Email (copyable) */}
          <TouchableOpacity
            onPress={() => handleCopy(student.email, 'Institutional Email')}
            style={styles.gridCard}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconBox}>
              <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Institutional Email</Text>
              <Text style={styles.cardValue} numberOfLines={1}>
                {student.email}
              </Text>
            </View>
            <Ionicons name="copy-outline" size={16} color={theme.colors.text.muted} />
          </TouchableOpacity>
        </View>

        {/* Faculty Advisor Section */}
        {student.facultyAdvisor ? (
          <View style={styles.advisorCard}>
            <View style={styles.advisorHeader}>
              <Ionicons name="school-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.advisorTitle}>Designated Faculty Advisor</Text>
            </View>
            <Text style={styles.advisorName}>{student.facultyAdvisor.name}</Text>
            <Text style={styles.advisorDetails}>
              {student.facultyAdvisor.office} • {student.facultyAdvisor.hours}
            </Text>
            <Text style={styles.advisorEmail}>{student.facultyAdvisor.email}</Text>
          </View>
        ) : null}

        {/* Notification Preferences */}
        <View style={styles.settingsSection}>
          <Text style={styles.settingsTitle}>Preferences & Alerts</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Autonomous Triage Push Alerts</Text>
              <Text style={styles.settingSub}>Immediate notifications when HOD approves docket</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
              thumbColor={pushEnabled ? theme.colors.primary : '#F4F3F4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingTextWrap}>
              <Text style={styles.settingLabel}>Institutional Email Digest</Text>
              <Text style={styles.settingSub}>Weekly academic attendance reports</Text>
            </View>
            <Switch
              value={emailAlerts}
              onValueChange={setEmailAlerts}
              trackColor={{ false: '#D1D5DB', true: '#818CF8' }}
              thumbColor={emailAlerts ? theme.colors.primary : '#F4F3F4'}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Sign Out of CampusDesk</Text>
        </TouchableOpacity>

        {/* Version stamp */}
        <Text style={styles.versionFooter}>
          CampusDesk Mobile Build v4.2.0 (52) • FERPA Protocol Verified
        </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSubtle,
    ...theme.shadows.sm,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  activePill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    gap: 6,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 36,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  studentName: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.text.heading,
    marginBottom: 3,
  },
  degreeLine: {
    fontSize: 13.5,
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  deptLine: {
    fontSize: 12,
    color: theme.colors.text.muted,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 20,
    ...theme.shadows.sm,
  },
  metricBox: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text.heading,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  sectionHeaderWrap: {
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  sectionHeaderSub: {
    fontSize: 11.5,
    color: theme.colors.text.subtle,
    marginTop: 1,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.sm,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: theme.radii.sm,
    backgroundColor: '#F4F5FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardInfo: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 10,
    color: theme.colors.text.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginTop: 1,
  },
  badgePill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },
  badgePillAmber: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  badgePillTextAmber: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
  advisorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    marginBottom: 18,
    ...theme.shadows.sm,
  },
  advisorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  advisorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  advisorName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: 2,
  },
  advisorDetails: {
    fontSize: 12,
    color: theme.colors.text.subtle,
    marginBottom: 2,
  },
  advisorEmail: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  settingsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    marginBottom: 18,
    ...theme.shadows.sm,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingTextWrap: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text.heading,
  },
  settingSub: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: theme.radii.full,
    paddingVertical: 12,
    gap: 6,
    marginBottom: 16,
  },
  logoutBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  versionFooter: {
    fontSize: 10.5,
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
});
