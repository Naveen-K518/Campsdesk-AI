import React, { useState, useEffect } from 'react';
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
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme/theme';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { useQueryContext } from '../../context/QueryContext';

// Complete any pending browser sessions for OAuth
WebBrowser.maybeCompleteAuthSession();

interface GoogleAuthConnectorProps {
  clientId: string;
  androidClientId?: string;
  iosClientId?: string;
  onSuccess: (idToken: string) => void;
  triggerRef: React.MutableRefObject<(() => Promise<void>) | null>;
}

const GoogleAuthConnector: React.FC<GoogleAuthConnectorProps> = ({
  clientId,
  androidClientId,
  iosClientId,
  onSuccess,
  triggerRef,
}) => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId,
    webClientId: clientId,
    androidClientId: androidClientId || undefined,
    iosClientId: iosClientId || undefined,
    prompt: AuthSession.Prompt.SelectAccount,
    extraParams: {
      prompt: 'select_account',
    },
  });

  useEffect(() => {
    triggerRef.current = async () => {
      try {
        const result = await promptAsync();
        if (result?.type === 'success') {
          const idToken = result.params?.id_token || (result as any).authentication?.idToken;
          if (idToken) {
            onSuccess(idToken);
          }
        }
      } catch (err: any) {
        console.warn('Google prompt error:', err);
        Alert.alert('Google Sign-In Error', err?.message || 'Authentication was interrupted.');
      }
    };
  }, [promptAsync, onSuccess, triggerRef]);

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || (response as any).authentication?.idToken;
      if (idToken) {
        onSuccess(idToken);
      }
    }
  }, [response, onSuccess]);

  return null;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, loginWithGoogle, logout } = useQueryContext();
  const isDev = __DEV__;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Modal states for role routing and registration errors
  const [unregisteredModalVisible, setUnregisteredModalVisible] = useState(false);
  const [showAdminNotice, setShowAdminNotice] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Google OAuth Configuration via expo-auth-session
  const googleWebClientId = (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '').trim();
  const googleAndroidClientId = (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '').trim();
  const googleIosClientId = (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '').trim();

  // Startup check: client ID must be non-empty and end with .apps.googleusercontent.com
  const isGoogleConfigured = Boolean(
    googleWebClientId && googleWebClientId.endsWith('.apps.googleusercontent.com')
  );

  const googleTriggerRef = React.useRef<(() => Promise<void>) | null>(null);

  // Startup warning
  useEffect(() => {
    if (!isGoogleConfigured) {
      console.log(
        '[Google Auth] Google sign-in is not configured. Email & password authentication is active.'
      );
    }
  }, [isGoogleConfigured]);

  const processGoogleToken = async (idToken: string) => {
    setLoading(true);
    setUnregisteredModalVisible(false);

    try {
      const result = await loginWithGoogle(idToken);
      setLoading(false);

      if (result.success && result.user) {
        const userRole = result.user.role;

        // Role-based routing strictly determined by server database:
        if (userRole === 'mentor' || userRole === 'faculty') {
          // Mentor -> Mentor Queue Dashboard
          navigation.replace('FacultyDashboard');
        } else if (userRole === 'admin') {
          // Admin -> Show notice and sign out of mobile app
          logout();
          setShowAdminNotice(true);
        } else {
          // Student -> Main Student App
          navigation.replace('Main');
        }
      } else {
        const err = result.error || 'Authentication failed';
        setErrorMessage(err);
        if (
          err.includes('not registered') ||
          err.includes('contact your administrator')
        ) {
          setUnregisteredModalVisible(true);
        } else {
          Alert.alert('Sign-In Failed', err);
        }
      }
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.message || 'Unable to connect to authentication service.');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleConfigured) {
      Alert.alert(
        'Google sign-in is not configured',
        'Google sign-in is currently disabled because EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured.\n\nPlease sign in with your email and password below.'
      );
      return;
    }

    if (googleTriggerRef.current) {
      await googleTriggerRef.current();
    } else {
      Alert.alert(
        'Google sign-in initializing',
        'Please wait a moment and try again.'
      );
    }
  };

  const handleSignIn = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your institutional email ID.');
      return;
    }
    if (!password) {
      Alert.alert('Password Required', 'Please enter your password.');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      const userRole = result.user?.role;
      const lower = email.trim().toLowerCase();
      if (
        userRole === 'mentor' ||
        userRole === 'faculty' ||
        lower.includes('faculty') ||
        lower.includes('mentor')
      ) {
        navigation.replace('FacultyDashboard');
      } else if (userRole === 'admin') {
        logout();
        setShowAdminNotice(true);
      } else {
        navigation.replace('Main');
      }
    } else {
      Alert.alert('Sign In Failed', result.error || 'Invalid institutional credentials. Please try again.');
    }
  };

  // Development helper to simulate verified Google ID tokens across process boundary
  const testSimulatedGoogleLogin = async (simulatedEmail: string, simulatedRole: string, simulatedName: string) => {
    const payload = {
      sub: `google_sub_${simulatedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: simulatedEmail,
      emailVerified: true,
      name: simulatedName,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const b64 = typeof btoa !== 'undefined'
      ? btoa(JSON.stringify(payload))
      : Buffer.from(JSON.stringify(payload)).toString('base64');
    const mockToken = `mock_google_token:${b64}`;
    await processGoogleToken(mockToken);
  };

  const setDemoCredentials = (role: 'student' | 'mentor' | 'admin') => {
    if (role === 'student') {
      setEmail('kishorkumarp.cs24@bitsathy.ac.in');
      setPassword('password123');
    } else if (role === 'admin') {
      setEmail('admin@campus.edu');
      setPassword('admin123');
    } else {
      setEmail('mentor.radhakrishnan@campus.edu');
      setPassword('mentor123');
    }
  };

  const openAdminPortalWeb = () => {
    setShowAdminNotice(false);
    const adminUrl = process.env.EXPO_PUBLIC_ADMIN_PORTAL_URL || 'http://localhost:5173';
    Linking.openURL(adminUrl).catch(() => {
      Alert.alert('Open Web Portal', `Please navigate to ${adminUrl} in your browser.`);
    });
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

          <Text style={styles.eyebrow}>STUDENT & FACULTY PLATFORM</Text>

          <View style={styles.portalPill}>
            <Text style={styles.portalPillText}>✨ Single Sign-On Enabled</Text>
          </View>
        </View>

        {/* Greetings */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingTitle}>Welcome Back</Text>
          <Text style={styles.greetingSub}>
            Sign in with your verified institutional account for automated academic triage and mentor advising.
          </Text>
        </View>

        {/* Primary SSO: Continue with Google */}
        <View style={styles.formCard}>
          {!isGoogleConfigured && (
            <View style={styles.notConfiguredBanner}>
              <Ionicons name="alert-circle" size={17} color="#B45309" style={{ marginRight: 8, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notConfiguredTitle}>Google sign-in is not configured</Text>
                <Text style={styles.notConfiguredSub}>
                  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is missing or does not end with .apps.googleusercontent.com in frontend/.env
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={handleGoogleSignIn}
            style={[
              styles.googleBtn,
              !isGoogleConfigured && styles.googleBtnDisabled,
            ]}
            activeOpacity={isGoogleConfigured ? 0.85 : 1}
            disabled={!isGoogleConfigured || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <>
                <Ionicons
                  name="logo-google"
                  size={19}
                  color={isGoogleConfigured ? '#EA4335' : '#9CA3AF'}
                  style={styles.googleIcon}
                />
                <Text
                  style={[
                    styles.googleBtnText,
                    !isGoogleConfigured && styles.googleBtnTextDisabled,
                  ]}
                >
                  {isGoogleConfigured ? 'Continue with Google' : 'Google sign-in is not configured'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.googleHint}>
            {isGoogleConfigured
              ? 'Always presents account chooser (`prompt=select_account`)'
              : 'Configure your Google OAuth Client ID to enable institutional SSO'}
          </Text>

          {/* Dev Quick SSO Simulator */}
          {isDev ? (
            <View style={styles.devSsoBlock}>
              <Text style={styles.devSsoHeader}>1-TAP GOOGLE SSO VERIFICATION:</Text>
              <View style={styles.devSsoRow}>
                <TouchableOpacity
                  onPress={() => testSimulatedGoogleLogin('kishorkumarp.cs24@bitsathy.ac.in', 'student', 'Kishorkumar P')}
                  style={[styles.devSsoPill, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
                >
                  <Text style={[styles.devSsoText, { color: theme.colors.primary }]}>👨‍🎓 Student Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => testSimulatedGoogleLogin('mentor.radhakrishnan@campus.edu', 'mentor', 'Dr. K. Radhakrishnan')}
                  style={[styles.devSsoPill, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                >
                  <Text style={[styles.devSsoText, { color: '#059669' }]}>👨‍🏫 Mentor Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => testSimulatedGoogleLogin('admin@campus.edu', 'admin', 'System Administrator')}
                  style={[styles.devSsoPill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                >
                  <Text style={[styles.devSsoText, { color: '#B45309' }]}>🛡️ Admin Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => testSimulatedGoogleLogin('unregistered.stranger@other.com', 'unknown', 'Stranger')}
                  style={[styles.devSsoPill, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}
                >
                  <Text style={[styles.devSsoText, { color: '#DC2626' }]}>❌ Unknown 403</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR SIGN IN WITH PASSWORD</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Field */}
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
                placeholder="e.g. mentor.radhakrishnan@campus.edu"
                placeholderTextColor={theme.colors.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.inputField}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Password</Text>
              <TouchableOpacity
                onPress={() => Alert.alert('Password Assistance', 'Institutional passwords are managed by university IT.')}
              >
                <Text style={styles.forgotText}>Need Help?</Text>
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

          {/* Sign In Button */}
          <PrimaryButton
            title={loading ? 'Verifying...' : 'Sign In with Password'}
            onPress={handleSignIn}
            disabled={loading}
            style={styles.signInBtn}
          />

          {/* Quick Credential Autofill (Dev) */}
          {isDev ? (
            <View style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: theme.colors.text.muted, fontWeight: '700', marginBottom: 6 }}>
                PASSWORD PREFILLS:
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  onPress={() => setDemoCredentials('student')}
                  style={[styles.devSsoPill, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
                >
                  <Text style={[styles.devSsoText, { color: theme.colors.primary }]}>Student</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDemoCredentials('mentor')}
                  style={[styles.devSsoPill, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                >
                  <Text style={[styles.devSsoText, { color: '#059669' }]}>Mentor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setDemoCredentials('admin')}
                  style={[styles.devSsoPill, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
                >
                  <Text style={[styles.devSsoText, { color: '#B45309' }]}>Admin</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        {/* Footer info */}
        <View style={styles.footerSection}>
          <View style={styles.complianceRow}>
            <Ionicons name="shield-checkmark" size={14} color="#059669" />
            <Text style={styles.complianceText}>Google OAuth 2.0 • Server-Verified Identity</Text>
          </View>
        </View>
      </ScrollView>

      {/* MODAL 1: Account Not Registered Error Dialog */}
      <Modal
        visible={unregisteredModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUnregisteredModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconCircleRed}>
              <Ionicons name="person-remove-outline" size={28} color="#DC2626" />
            </View>

            <Text style={styles.dialogTitle}>Account Not Registered</Text>
            <Text style={styles.dialogMessage}>
              This email is not registered with CampusDesk. Please contact your administrator.
            </Text>

            <TouchableOpacity
              onPress={handleGoogleSignIn}
              style={styles.dialogPrimaryBtn}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.dialogPrimaryBtnText}>Try Another Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setUnregisteredModalVisible(false)}
              style={styles.dialogCancelBtn}
            >
              <Text style={styles.dialogCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Admin Portal Notice */}
      <Modal
        visible={showAdminNotice}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAdminNotice(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconCircleAmber}>
              <Ionicons name="desktop-outline" size={28} color="#D97706" />
            </View>

            <Text style={styles.dialogTitle}>Admins Use the Web Portal</Text>
            <Text style={styles.dialogMessage}>
              System administrators manage users, ordinances, and system telemetry from the CampusDesk Admin Web Portal.
            </Text>

            <TouchableOpacity
              onPress={openAdminPortalWeb}
              style={[styles.dialogPrimaryBtn, { backgroundColor: '#D97706' }]}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.dialogPrimaryBtnText}>Open Web Portal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowAdminNotice(false)}
              style={styles.dialogCancelBtn}
            >
              <Text style={styles.dialogCancelBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {isGoogleConfigured && (
        <GoogleAuthConnector
          clientId={googleWebClientId}
          androidClientId={googleAndroidClientId}
          iosClientId={googleIosClientId}
          onSuccess={processGoogleToken}
          triggerRef={googleTriggerRef}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 40,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoTile: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  brandWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.heading,
    letterSpacing: -0.4,
  },
  aiBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    color: theme.colors.text.muted,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  portalPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radii.full,
    marginTop: 8,
  },
  portalPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  greetingBlock: {
    marginBottom: 18,
    alignItems: 'center',
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text.heading,
  },
  greetingSub: {
    fontSize: 13,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  googleBtnDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.7,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  googleBtnTextDisabled: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  notConfiguredBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  notConfiguredTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#92400E',
  },
  notConfiguredSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 15,
  },
  googleHint: {
    fontSize: 11,
    color: theme.colors.text.muted,
    textAlign: 'center',
    marginTop: 6,
  },
  devSsoBlock: {
    marginTop: 14,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  devSsoHeader: {
    fontSize: 9.5,
    fontWeight: '800',
    color: theme.colors.text.muted,
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  devSsoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  devSsoPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  devSsoText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginHorizontal: 10,
  },
  inputGroup: {
    marginBottom: 14,
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
    color: '#334155',
    marginBottom: 6,
  },
  forgotText: {
    fontSize: 11.5,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 13.5,
    color: theme.colors.text.heading,
  },
  eyeBtn: {
    padding: 6,
  },
  signInBtn: {
    marginTop: 4,
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 22,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  complianceText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },

  // Modal Dialog Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  dialogIconCircleRed: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dialogIconCircleAmber: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 13.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  dialogPrimaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  dialogPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dialogCancelBtn: {
    paddingVertical: 8,
  },
  dialogCancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
