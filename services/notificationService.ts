import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

// Global variable to track the chat the user is currently looking at
// This allows us to silence system notifications for THAT specific chat in the foreground
let activeMatchId: string | null = null;

// 1. Configure Global Handler
Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
        // Get the matchId from the notification data
        const data = notification.request.content.data as any;
        const incomingMatchId = data?.matchId;

        // Determine if we should show the alert
        // If the user is already in this chat (activeMatchId matches), we SILENCE the system notification
        const isCurrentlyViewingThisChat = activeMatchId && incomingMatchId &&
            (activeMatchId.toLowerCase() === incomingMatchId.toLowerCase());

        return {
            shouldShowAlert: !isCurrentlyViewingThisChat,
            shouldPlaySound: !isCurrentlyViewingThisChat,
            shouldSetBadge: true,
            // Modern Expo/OS properties
            shouldShowBanner: !isCurrentlyViewingThisChat,
            shouldShowList: true,
        };
    },
});

export const notificationService = {
    setActiveChatId(id: string | null) {
        activeMatchId = id;
    },
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
    },

    async sendPushNotification(expoPushToken: string, title: string, body: string, data: any, type: 'message' | 'call' = 'message') {
        const message = {
            to: expoPushToken,
            sound: 'default',
            title: title,
            body: body,
            data: { ...data, type }, // Ensure type is in data for handling
            channelId: type === 'call' ? 'calls' : 'default',
            priority: type === 'call' ? 'high' : 'normal',
            ttl: type === 'call' ? 60 : 2419200, // Calls expire quickly (60s), messages last 4 weeks
        };

        try {
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });
            const result = await response.json();
            // console.log('Push send result:', result);
        } catch (error) {
            console.error('Error sending push notification:', error);
        }
    }
};
