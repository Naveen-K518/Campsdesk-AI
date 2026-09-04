import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { theme } from '../../theme/theme';
import { useQueryContext } from '../../context/QueryContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

export const NotificationsModal: React.FC<Props> = ({ navigation }) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useQueryContext();

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return { name: 'checkmark-circle' as const, color: '#10B981', bg: '#ECFDF5' };
      case 'alert':
        return { name: 'warning' as const, color: '#F59E0B', bg: '#FFFBEB' };
      case 'update':
        return { name: 'sync-circle' as const, color: '#3B82F6', bg: '#EFF6FF' };
      default:
        return { name: 'notifications' as const, color: theme.colors.primary, bg: '#EEF2FF' };
    }
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={markAllNotificationsAsRead}
          activeOpacity={0.7}
        >
          <Text style={styles.markAllText}>Mark Read</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.map((item) => {
          const iconConfig = getNoticeIcon(item.type);

          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                markNotificationAsRead(item.id);
                if (item.linkQueryId) {
                  navigation.navigate('QueryDetail', { queryId: item.linkQueryId });
                }
              }}
              activeOpacity={0.8}
              style={[
                styles.noticeCard,
                !item.read && styles.noticeUnread,
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: iconConfig.bg }]}>
                <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
              </View>

              <View style={styles.contentWrap}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, !item.read && styles.titleBold]}>
                    {item.title}
                  </Text>
                  {!item.read ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={styles.timestamp}>{item.timestamp}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
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
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  scrollContent: {
    padding: 16,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radii.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.sm,
  },
  noticeUnread: {
    backgroundColor: '#F8FAFF',
    borderColor: '#C7D2FE',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '600',
    color: theme.colors.text.heading,
    flex: 1,
  },
  titleBold: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.colors.primary,
    marginLeft: 6,
  },
  description: {
    fontSize: 12,
    color: theme.colors.text.body,
    lineHeight: 16,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 10.5,
    color: theme.colors.text.muted,
  },
});
