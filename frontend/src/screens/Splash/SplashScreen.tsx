import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { useQueryContext } from '../../context/QueryContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { isLoggedIn } = useQueryContext();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Always navigate to Login on app open so user can sign in or switch profiles
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 1800);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, glowAnim, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F1A" />

      {/* Subtle background grid effect */}
      <View style={styles.gridOverlay}>
        <View style={styles.gridLineHorizontal} />
        <View style={[styles.gridLineHorizontal, { top: '35%' }]} />
        <View style={[styles.gridLineHorizontal, { top: '65%' }]} />
        <View style={styles.gridLineVertical} />
        <View style={[styles.gridLineVertical, { left: '70%' }]} />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Glowing Logo Tile */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              opacity: glowAnim,
            },
          ]}
        />
        <View style={styles.iconTile}>
          <Ionicons name="school" size={44} color="#FFFFFF" />
          <View style={styles.sparkleBadge}>
            <Ionicons name="sparkles" size={14} color="#3B82F6" />
          </View>
        </View>

        {/* ● AGENTIC AI Pill */}
        <View style={styles.agenticPill}>
          <View style={styles.greenDot} />
          <Text style={styles.agenticText}>AGENTIC AI</Text>
        </View>

        {/* App Wordmark */}
        <View style={styles.brandRow}>
          <Text style={styles.brandName}>CampusDesk</Text>
          <View style={styles.aiWordBadge}>
            <Text style={styles.aiWordText}>AI</Text>
          </View>
        </View>

        {/* Eyebrow */}
        <Text style={styles.eyebrow}>STUDENT INTELLIGENCE PLATFORM</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Smart query resolution, attendance tracking & academic assistance.
        </Text>
      </Animated.View>

      {/* Footer copyright */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Fall 2025 • Autonomous Campus Protocol</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '20%',
    height: 1,
    backgroundColor: '#3B82F6',
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '30%',
    width: 1,
    backgroundColor: '#4F46E5',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  glowRing: {
    position: 'absolute',
    top: -12,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4F46E5',
    opacity: 0.4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 20,
  },
  iconTile: {
    width: 96,
    height: 96,
    borderRadius: 26,
    backgroundColor: '#1E2746',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  sparkleBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0B0F1A',
  },
  agenticPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  agenticText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 1.2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  aiWordBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  aiWordText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
