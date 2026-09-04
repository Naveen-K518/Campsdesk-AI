import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import { BottomTabBar } from '../components/navigation/BottomTabBar';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { HistoryScreen } from '../screens/History/HistoryScreen';
import { AskAIChatScreen } from '../screens/AskAI/AskAIChatScreen';
import { GuidelinesScreen } from '../screens/Guidelines/GuidelinesScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="HomeTab"
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryScreen}
        options={{ title: 'History' }}
      />
      <Tab.Screen
        name="AskAITab"
        component={AskAIChatScreen}
        options={{ title: 'Ask AI' }}
      />
      <Tab.Screen
        name="GuidelinesTab"
        component={GuidelinesScreen}
        options={{ title: 'Guidelines' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};
