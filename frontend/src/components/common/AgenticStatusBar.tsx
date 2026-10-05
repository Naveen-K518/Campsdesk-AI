import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../../theme/theme';

interface AgenticStatusBarProps {
  modelVersion?: string;
  isOnline?: boolean;
  pulseColor?: string;
}

export const AgenticStatusBar: React.FC<AgenticStatusBarProps> = ({
  modelVersion = 'v4.2',
  isOnline = true,
  pulseColor = '#10B981',
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: pulseColor,
            opacity: pulseAnim,
          },
        ]}
      />
      <Text style={styles.textBrand}>Agentic AI</Text>
      <View style={styles.divider} />
      <Text style={styles.textVersion}>{modelVersion}</Text>
      <View style={styles.divider} />
      <Text style={[styles.textStatus, { color: isOnline ? '#10B981' : theme.colors.text.muted }]}>
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  textBrand: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    letterSpacing: 0.2,
  },
  textVersion: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  textStatus: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#A7F3D0',
    marginHorizontal: 5,
  },
});
