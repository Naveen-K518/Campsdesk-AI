import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'white';
  size?: 'sm' | 'md' | 'lg';
  iconName?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  iconName = 'arrow-forward',
  iconPosition = 'right',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = true,
}) => {
  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const paddingVertical = isSmall ? 8 : isLarge ? 16 : 12;
  const paddingHorizontal = isSmall ? 16 : isLarge ? 28 : 20;
  const fontSize = isSmall ? 13 : isLarge ? 16 : 14;

  const content = (
    <View style={styles.innerRow}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? theme.colors.primary : '#FFFFFF'}
          style={styles.loader}
        />
      ) : (
        <>
          {iconName && iconPosition === 'left' ? (
            <Ionicons
              name={iconName}
              size={fontSize + 2}
              color={
                variant === 'outline'
                  ? theme.colors.primary
                  : variant === 'white'
                  ? theme.colors.primary
                  : '#FFFFFF'
              }
              style={styles.iconLeft}
            />
          ) : null}

          <Text
            style={[
              styles.text,
              {
                fontSize,
                color:
                  variant === 'outline'
                    ? theme.colors.primary
                    : variant === 'white'
                    ? theme.colors.primary
                    : '#FFFFFF',
              },
              textStyle,
            ]}
          >
            {title}
          </Text>

          {iconName && iconPosition === 'right' ? (
            <Ionicons
              name={iconName}
              size={fontSize + 2}
              color={
                variant === 'outline'
                  ? theme.colors.primary
                  : variant === 'white'
                  ? theme.colors.primary
                  : '#FFFFFF'
              }
              style={styles.iconRight}
            />
          ) : null}
        </>
      )}
    </View>
  );

  if (variant === 'primary' && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.88}
        style={[styles.container, fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={theme.colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.gradient,
            {
              paddingVertical,
              paddingHorizontal,
              borderRadius: theme.radii.full,
            },
            theme.shadows.md,
          ]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.container,
        fullWidth && styles.fullWidth,
        variant === 'outline' && styles.outline,
        variant === 'secondary' && styles.secondary,
        variant === 'white' && styles.white,
        disabled && styles.disabled,
        {
          paddingVertical,
          paddingHorizontal,
          borderRadius: theme.radii.full,
        },
        style,
      ]}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  iconRight: {
    marginLeft: 8,
  },
  iconLeft: {
    marginRight: 8,
  },
  loader: {
    marginVertical: 2,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  white: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  disabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
