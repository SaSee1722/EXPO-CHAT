import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { AuthProvider, AlertProvider } from '@/template';
import { ProfileGuard } from '@/components/ProfileGuard';
import { ProfileProvider } from '@/context/ProfileContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Set up global audio mode that works for both calls and voice notes
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
        });
      } catch (e) {
        console.error('[RootLayout] Failed to set audio mode:', e);
      }
    };

    const setupAndroidBranding = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setBackgroundColorAsync('#000000');
          await NavigationBar.setButtonStyleAsync('light');
        } catch (e) {
          console.log('[RootLayout] Nav Bar error:', e);
        }
      }
    };

    const initialize = async () => {
      await setupAudio();
      await setupAndroidBranding();
      // Keep splash screen a bit longer to ensure smooth transition
      setTimeout(async () => {
        await SplashScreen.hideAsync();
      }, 500);
    };

    initialize();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AlertProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AuthProvider>
            <ProfileProvider>
              <NotificationProvider>
                <ProfileGuard>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="auth" />
                    <Stack.Screen name="setup-profile" />
                    <Stack.Screen name="chat/[matchId]" />
                  </Stack>
                </ProfileGuard>
              </NotificationProvider>
            </ProfileProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </AlertProvider>
    </GestureHandlerRootView>
  );
}
