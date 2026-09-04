import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { QueryProvider } from './src/context/QueryContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    // Keep splash background dark navy (#0B0F1A) to avoid white flash
    return <View style={styles.loadingContainer} />;
  }

  const appContent = (
    <SafeAreaProvider>
      <QueryProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootNavigator />
        </NavigationContainer>
      </QueryProvider>
    </SafeAreaProvider>
  );

  // If running in desktop web browser, wrap in responsive mobile container
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuterBackground}>
        <View style={styles.webMobileContainer}>
          {appContent}
        </View>
      </View>
    );
  }

  return appContent;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  webOuterBackground: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  webMobileContainer: {
    width: '100%',
    maxWidth: 440,
    height: '100%',
    maxHeight: 940,
    backgroundColor: '#F4F5FB',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
  },
});
