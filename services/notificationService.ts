import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

// 1. Configure Global Handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: false, // We will show custom Banner
        shouldPlaySound: true,
        shouldSetBadge: true,
    } as any),
});

export const notificationService = {
    async registerForPushNotificationsAsync(userId: string) {
        if (Platform.OS === 'android') {
            // Default channel for messages
            await Notifications.setNotificationChannelAsync('default', {
                name: 'Messages',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });

            // High priority channel for calls
            await Notifications.setNotificationChannelAsync('calls', {
                name: 'Calls',
                importance: Notifications.AndroidImportance.MAX,
                sound: 'default',
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#87CEEB',
            });
        }

        if (!Device.isDevice) {
            console.log('Must use physical device for Push Notifications');
            return null;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }

        // Get the token (Project ID is strictly required for Expo Push, but for raw FCM we might just use default)
        // For now, assuming Expo management structure or standard getExpoPushToken
        // If using bare FCM, we 'd use getDevicePushTokenAsync. 
        // Let's stick to Expo Push Token for ease, or Device if they set up FCM credentials directly.
        // Given the request for "FCM", usually implies direct credential usage, but Expo handles this nicely.

        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            if (!projectId) {
                console.warn('EAS Project ID not found in config. Push tokens might fail.');
            }

            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: projectId,
            });
            const token = tokenData.data;

            // Save to Supabase
            await this.updatePushToken(userId, token);
            return token;
        } catch (e) {
            console.error("Error getting push token:", e);
            return null;
        }
    },

    async updatePushToken(userId: string, token: string) {
        const { error } = await supabase
            .from('profiles')
            .update({ push_token: token })
            .eq('id', userId);

        if (error) {
            console.error("Failed to update push token:", error);
        }
    },

    // Helper to schedule local notification (simulating background receipt if needed)
    async triggerLocalNotification(title: string, body: string, data: any) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
            },
            trigger: null, // Immediate
        });
    }
};
