import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface CustomTabButtonProps {
  onPress?: () => void;
  accessibilityState?: { selected?: boolean };
  label?: string;
}

export const CustomTabButton: React.FC<CustomTabButtonProps> = ({
  onPress,
  accessibilityState,
  label = 'Ask AI',
}) => {
  const isSelected = accessibilityState?.selected;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={styles.container}
      >
        <LinearGradient
          colors={theme.colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientCircle, theme.shadows.glow]}
        >
          <Ionicons name="sparkles" size={26} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[styles.label, isSelected && styles.selectedLabel]}>
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  selectedLabel: {
    color: '#3B82F6',
  },
});
