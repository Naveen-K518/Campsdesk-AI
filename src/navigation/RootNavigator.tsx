import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { SplashScreen } from '../screens/Splash/SplashScreen';
import { LoginScreen } from '../screens/Auth/LoginScreen';
import { BottomTabNavigator } from './BottomTabNavigator';
import { QueryDetailScreen } from '../screens/Detail/QueryDetailScreen';
import { NotificationsModal } from '../screens/Home/NotificationsModal';

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
        name="Main"
        component={BottomTabNavigator}
        options={{ animation: 'fade' }}
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
