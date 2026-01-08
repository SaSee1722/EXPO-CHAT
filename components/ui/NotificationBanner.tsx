import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface NotificationPayload {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string | null;
    content: string;
    chatId: string;
    type?: 'message' | 'call';
    callId?: string;
    callType?: 'voice' | 'video';
}

interface NotificationBannerProps {
    notification: NotificationPayload | null;
    onPress: () => void;
    onDismiss: () => void;
    onAction?: (action: 'accept' | 'decline') => void;
    visible: boolean;
}

export function NotificationBanner({ notification, onPress, onDismiss, onAction, visible }: NotificationBannerProps) {
    const insets = useSafeAreaInsets();

    if (!visible || !notification) return null;

    return (
        <Animated.View
            entering={FadeInUp.duration(400)}
            exiting={FadeOutUp.duration(300)}
            style={[styles.wrapper, { top: insets.top + 8 }]}
        >
            <TouchableOpacity
                style={styles.container}
                onPress={onPress}
                activeOpacity={0.9}
            >
                {/* Avatar Section */}
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: notification.senderAvatar || 'https://via.placeholder.com/100/333333/FFFFFF?text=User' }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                    />
                    <View style={styles.onlineDot} />
                </View>

                {/* Content Section */}
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name} numberOfLines={1}>{notification.senderName}</Text>
                        <Text style={styles.time}>Just now</Text>
                    </View>
                    <Text style={styles.message} numberOfLines={2}>
                        {notification.content}
                    </Text>

                    {/* Call Actions */}
                    {notification.type === 'call' && onAction && (
                        <View style={styles.actionRow}>
                            <TouchableOpacity style={[styles.actionButton, styles.declineButton]} onPress={() => onAction('decline')}>
                                <Ionicons name="close" size={20} color="#FFF" />
                                <Text style={styles.actionText}>Decline</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={() => onAction('accept')}>
                                <Ionicons name={notification.callType === 'video' ? "videocam" : "call"} size={20} color="#FFF" />
                                <Text style={styles.actionText}>Accept</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        width: '92%',
        alignSelf: 'center',
        zIndex: 9999,
        borderRadius: 20,
        backgroundColor: '#1C1C1E', // Premium Dark Gray
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.44,
        shadowRadius: 10.32,
        elevation: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    container: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'flex-start',
    },
    avatarContainer: {
        marginRight: 12,
        position: 'relative',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#333',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4CAF50',
        borderWidth: 2,
        borderColor: '#1C1C1E',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 0.5,
        flex: 1,
    },
    time: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '500',
    },
    message: {
        color: '#E0E0E0',
        fontSize: 14,
        lineHeight: 18,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 12
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6
    },
    acceptButton: {
        backgroundColor: '#4CAF50',
    },
    declineButton: {
        backgroundColor: '#FF3B30',
    },
    actionText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 14
    }
});
