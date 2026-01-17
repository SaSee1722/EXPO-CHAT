import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, PermissionsAndroid } from 'react-native';
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
import { Camera } from 'expo-camera';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({});

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
        console.log('[RootLayout] 🔐 Requesting all permissions...');

        // 1. Notifications (Required for Android 13+)
        const { status: notifStatus } = await import('expo-notifications').then(n => n.requestPermissionsAsync());
        console.log('[RootLayout] Notification permission:', notifStatus);

        // 2. Microphone (Required for Calls)
        const { status: audioStatus } = await Audio.requestPermissionsAsync();
        console.log('[RootLayout] Microphone permission:', audioStatus);

        // 3. Camera (Required for Video Calls)
        if (Platform.OS === 'android') {

          // Android 13+ Notification Permission (explicit check)
          if (Platform.Version >= 33) {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            console.log('[RootLayout] Android 13+ Notification permission:', granted);
          }

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
          // iOS
          const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
          console.log('[RootLayout] iOS Camera permission:', cameraStatus);
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
      // 1. Setup minimal essentials
      await setupAudio();
      await setupAndroidBranding();

      // 2. Hide splash screen *before* asking for permissions
      // This ensures the user sees the app UI even if they ignore the permission dialog
      if (fontsLoaded) {
        await SplashScreen.hideAsync();
      }

      // 3. Request permissions after a short delay to allow UI to render
      setTimeout(() => {
        requestPermissions();
      }, 1000);
    };

    if (fontsLoaded) {
      initialize();
    }
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
