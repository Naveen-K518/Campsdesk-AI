import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme/theme';
import { CustomTabButton } from './CustomTabButton';

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  const getIconName = (routeName: string, isFocused: boolean): keyof typeof Ionicons.glyphMap => {
    switch (routeName) {
      case 'Home':
      case 'HomeTab':
        return isFocused ? 'home' : 'home-outline';
      case 'History':
      case 'HistoryTab':
        return isFocused ? 'time' : 'time-outline';
      case 'AskAI':
      case 'AskAITab':
        return 'sparkles';
      case 'Guidelines':
      case 'GuidelinesTab':
        return isFocused ? 'book' : 'book-outline';
      case 'Profile':
      case 'ProfileTab':
        return isFocused ? 'person' : 'person-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const getLabel = (routeName: string): string => {
    switch (routeName) {
      case 'Home':
      case 'HomeTab':
        return 'Home';
      case 'History':
      case 'HistoryTab':
        return 'History';
      case 'AskAI':
      case 'AskAITab':
        return 'Ask AI';
      case 'Guidelines':
      case 'GuidelinesTab':
        return 'Guidelines';
      case 'Profile':
      case 'ProfileTab':
        return 'Profile';
      default:
        return routeName;
    }
  };

  return (
    <View
      style={[
        styles.barContainer,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.tabsRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const isCenterTab = route.name === 'AskAI' || route.name === 'AskAITab';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isCenterTab) {
            return (
              <CustomTabButton
                key={route.key}
                onPress={onPress}
                accessibilityState={{ selected: isFocused }}
                label="Ask AI"
              />
            );
          }

          const iconName = getIconName(route.name, isFocused);
          const label = options.tabBarLabel !== undefined
            ? (options.tabBarLabel as string)
            : options.title !== undefined
            ? options.title
            : getLabel(route.name);

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={isFocused ? theme.colors.primary : theme.colors.text.muted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? theme.colors.primary : theme.colors.text.muted,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  barContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
    ...theme.shadows.md,
  },
  tabsRow: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 3,
    letterSpacing: 0.1,
  },
});
