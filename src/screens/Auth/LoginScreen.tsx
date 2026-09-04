import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme/theme';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { useQueryContext } from '../../context/QueryContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, student } = useQueryContext();
  const [email, setEmail] = useState('aarav.sharma@campus.edu');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your institutional email ID.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login();
      navigation.replace('Main');
    }, 600);
  };

  const handleGoogleSignIn = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login();
      navigation.replace('Main');
    }, 500);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <LinearGradient
            colors={theme.colors.primaryGradient}
            style={styles.logoTile}
          >
            <Ionicons name="school" size={26} color="#FFFFFF" />
          </LinearGradient>

          <View style={styles.brandWordRow}>
            <Text style={styles.brandTitle}>CampusDesk</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>STUDENT INTELLIGENCE PLATFORM</Text>

          <View style={styles.portalPill}>
            <Text style={styles.portalPillText}>✨ Agentic Campus Portal</Text>
          </View>
        </View>

        {/* Greetings */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingTitle}>Welcome Back</Text>
          <Text style={styles.greetingSub}>
            Sign in to access your autonomous Academic Help Desk and instant ordinance verifications.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Institutional Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Institutional Email ID</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={theme.colors.text.muted}
                style={styles.inputIcon}
              />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="e.g. name@campus.edu"
                placeholderTextColor={theme.colors.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.inputField}
              />
            </View>
            <Text style={styles.helperText}>
              Students & Faculty: Enter your official university email ID
            </Text>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Email Password</Text>
              <TouchableOpacity
                onPress={() => Alert.alert('Password Reset', 'A reset link has been dispatched to your university inbox.')}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={theme.colors.text.muted}
                style={styles.inputIcon}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={theme.colors.text.muted}
                secureTextEntry={!showPassword}
                style={styles.inputField}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.colors.text.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember me & 256-bit notice */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              onPress={() => setRememberMe(!rememberMe)}
              style={styles.rememberWrap}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxActive,
                ]}
              >
                {rememberMe ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                ) : null}
              </View>
              <Text style={styles.rememberText}>Remember this device</Text>
            </TouchableOpacity>

            <View style={styles.secureBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Text style={styles.secureText}>Secured 256-bit</Text>
            </View>
          </View>

          {/* Primary CTA */}
          <PrimaryButton
            title="Sign In to CampusDesk →"
            onPress={handleSignIn}
            loading={loading}
            size="lg"
            style={styles.signInBtn}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            onPress={handleGoogleSignIn}
            style={styles.googleBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={18} color="#EA4335" style={styles.googleIcon} />
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footerSection}>
          <View style={styles.complianceRow}>
            <Ionicons name="shield-outline" size={13} color={theme.colors.text.muted} />
            <Text style={styles.complianceText}>
              Protected by University IT & FERPA Compliant
            </Text>
          </View>

          <View style={styles.statusLineRow}>
            <View style={styles.operationalDot} />
            <Text style={styles.operationalText}>All Systems Operational</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 36,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoTile: {
    width: 54,
    height: 54,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...theme.shadows.md,
  },
  brandWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.text.heading,
    letterSpacing: -0.5,
  },
  aiBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginLeft: 6,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text.muted,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  portalPill: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  portalPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  greetingBlock: {
    marginBottom: 20,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 13,
    color: theme.colors.text.body,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.md,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: theme.colors.text.heading,
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.heading,
  },
  eyeBtn: {
    padding: 6,
  },
  helperText: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 5,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  rememberText: {
    fontSize: 12,
    color: theme.colors.text.body,
    fontWeight: '500',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secureText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  signInBtn: {
    marginTop: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text.muted,
    letterSpacing: 0.8,
    marginHorizontal: 10,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: theme.radii.full,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  googleIcon: {
    marginRight: 8,
  },
  googleBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: theme.colors.text.heading,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 22,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  complianceText: {
    fontSize: 11,
    color: theme.colors.text.muted,
  },
  statusLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  operationalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  operationalText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
});
