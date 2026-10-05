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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { registerUser } = useQueryContext();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [program, setProgram] = useState('B.Tech · Computer Science & Engineering');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Required', 'Please enter a valid institutional email address.');
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert('Password Length', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await registerUser({
      name: name.trim(),
      email: email.trim(),
      rollNo: rollNo.trim() || undefined,
      program: program.trim(),
      password,
    });
    setLoading(false);

    if (result.success) {
      Alert.alert('Account Created', 'Welcome to CampusDesk AI! Your student profile is active.', [
        {
          text: 'Get Started →',
          onPress: () => navigation.replace('Main'),
        },
      ]);
    } else {
      Alert.alert('Registration Failed', result.error || 'Unable to create account.');
    }
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

          <Text style={styles.eyebrow}>NEW STUDENT REGISTRATION</Text>
        </View>

        {/* Greetings */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingTitle}>Create Your Account</Text>
          <Text style={styles.greetingSub}>
            Register with your institutional email to access autonomous academic grievance and policy resolution.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color={theme.colors.text.muted} style={styles.inputIcon} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Priya Sundaram"
                placeholderTextColor={theme.colors.text.muted}
                style={styles.inputField}
              />
            </View>
          </View>

          {/* Institutional Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Institutional Email ID</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={theme.colors.text.muted} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@campus.edu"
                placeholderTextColor={theme.colors.text.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.inputField}
              />
            </View>
          </View>

          {/* Roll Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Roll Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={18} color={theme.colors.text.muted} style={styles.inputIcon} />
              <TextInput
                value={rollNo}
                onChangeText={setRollNo}
                placeholder="e.g. 23BCS10892"
                placeholderTextColor={theme.colors.text.muted}
                autoCapitalize="characters"
                style={styles.inputField}
              />
            </View>
          </View>

          {/* Program / Department */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Program / Branch</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="book-outline" size={18} color={theme.colors.text.muted} style={styles.inputIcon} />
              <TextInput
                value={program}
                onChangeText={setProgram}
                placeholder="e.g. B.Tech Computer Science"
                placeholderTextColor={theme.colors.text.muted}
                style={styles.inputField}
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.colors.text.muted} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={theme.colors.text.muted}
                secureTextEntry={!showPassword}
                style={styles.inputField}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.text.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.text.muted} style={styles.inputIcon} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor={theme.colors.text.muted}
                secureTextEntry={!showPassword}
                style={styles.inputField}
              />
            </View>
          </View>

          {/* Primary CTA */}
          <PrimaryButton
            title="Create Student Account →"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={styles.registerBtn}
          />

          {/* Link to sign in */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.signInRow}
            activeOpacity={0.75}
          >
            <Text style={styles.signInText}>Already have an account? </Text>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
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
    paddingTop: 40,
    paddingBottom: 36,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoTile: {
    width: 50,
    height: 50,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...theme.shadows.md,
  },
  brandWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.text.heading,
  },
  aiBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginLeft: 6,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text.muted,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  greetingBlock: {
    marginBottom: 16,
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text.heading,
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 12.5,
    color: theme.colors.text.body,
    lineHeight: 17,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.md,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text.heading,
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: theme.radii.md,
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
  registerBtn: {
    marginTop: 8,
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  signInText: {
    fontSize: 13,
    color: theme.colors.text.body,
  },
  signInLink: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primary,
  },
});
