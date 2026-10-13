import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { SplashScreen } from '../screens/Splash/SplashScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { RegisterScreen } from '../screens/Auth/RegisterScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { QueryDetailScreen } from '../screens/Detail/QueryDetailScreen';
import { NotificationsModal } from '../screens/Home/NotificationsModal';
import { FacultyDashboardScreen } from '../screens/Faculty/FacultyDashboardScreen';
import { TimetableNoticesScreen } from '../screens/Timetable/TimetableNoticesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Main"
        component={BottomTabNavigator}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="FacultyDashboard"
        component={FacultyDashboardScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MentorQueue"
        component={FacultyDashboardScreen}
        options={{ animation: 'slide_from_right' }}
      />

      <Stack.Screen
        name="TimetableNotices"
        component={TimetableNoticesScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />

      <Stack.Screen
        name="QueryDetail"
        component={QueryDetailScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsModal}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
};
