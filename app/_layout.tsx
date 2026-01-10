import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { AuthProvider, AlertProvider } from '@/template';
import { ProfileGuard } from '@/components/ProfileGuard';
import { ProfileProvider } from '@/context/ProfileContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { WebRTCProvider } from '@/context/WebRTCContext';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Set up global audio mode
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

    const requestPermissions = async () => {
      try {
        // Request microphone permission
        const { status: audioStatus } = await Audio.requestPermissionsAsync();
        console.log('[RootLayout] Microphone permission:', audioStatus);

        // Request camera permission (for video calls)
        if (Platform.OS === 'android') {
          const { PermissionsAndroid } = require('react-native');
          const cameraGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Permission',
              message: 'Gossip needs access to your camera for video calls.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          console.log('[RootLayout] Camera permission:', cameraGranted);
        } else {
          // iOS camera permission will be requested when needed
          console.log('[RootLayout] iOS camera permission will be requested on first use');
        }
      } catch (e) {
        console.error('[RootLayout] Failed to request permissions:', e);
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
      await requestPermissions();
      await setupAndroidBranding();
      if (fontsLoaded) {
        // Keep splash screen a bit longer to ensure smooth transition
        setTimeout(async () => {
          await SplashScreen.hideAsync();
        }, 500);
      }
    };

    initialize();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AlertProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AuthProvider>
            <ProfileProvider>
              <NotificationProvider>
                <WebRTCProvider>
                  <ProfileGuard>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen name="auth" />
                      <Stack.Screen name="setup-profile" />
                      <Stack.Screen name="chat/[matchId]" />
                    </Stack>
                  </ProfileGuard>
                </WebRTCProvider>
              </NotificationProvider>
            </ProfileProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </AlertProvider>
    </GestureHandlerRootView>
  );
}
