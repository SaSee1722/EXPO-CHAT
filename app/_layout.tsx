import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, AlertProvider } from '@/template';
import { ProfileGuard } from '@/components/ProfileGuard';
import { ProfileProvider } from '@/context/ProfileContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { Audio } from 'expo-av';

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
          // Match WebRTC requirements
          interruptionModeIOS: 1, // InterruptionModeIOS.DoNotMix
          interruptionModeAndroid: 1, // InterruptionModeAndroid.DoNotMix
        });
        console.log('[RootLayout] Global audio mode initialized');
      } catch (e) {
        console.error('[RootLayout] Failed to set audio mode:', e);
      }
    };
    setupAudio();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AlertProvider>
        <SafeAreaProvider>
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
