import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useAuth } from '@/template';
import { callService } from '@/services/callService';
import { Call } from '@/types';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';
import { Spacing, Colors, Typography, getGenderColor } from '@/constants/theme';
import { Image } from 'expo-image';
import { useNotifications } from '@/context/NotificationContext';
import { webrtcService } from '@/services/webrtcService';

export default function CallsScreen() {
    const { user } = useAuth();
    const [calls, setCalls] = useState<Call[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { setActiveCall, setCallOtherProfile, setIsCallIncoming } = useNotifications();

    const fetchCalls = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await callService.getUserCalls(user.id);
        if (data) setCalls(data);
        setLoading(false);
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchCalls();
        }, [fetchCalls])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchCalls();
        setRefreshing(false);
    }, [fetchCalls]);

    const handleCallPress = (call: Call, type: 'voice' | 'video' = 'voice') => {
        initiateCall(call, type);
    };

    const initiateCall = async (call: Call, type: 'voice' | 'video') => {
        if (!user) return;
        const otherProfile = call.caller_id === user.id ? call.receiver : call.caller;
        if (!otherProfile) return;

        const { data, error } = await callService.initiateCall(
            call.match_id,
            user.id,
            otherProfile.id,
            type
        );

        if (!error && data) {
            // CRITICAL: Initialize signaling for this match BEFORE notifying the other user
            await webrtcService.initialize(user.id, call.match_id, false, type === 'video');
            webrtcService.notifyCallStarted(data);
            setCallOtherProfile(otherProfile);
            setActiveCall(data);
            setIsCallIncoming(false);
        }
    };

    const renderCallItem = ({ item }: { item: Call }) => {
        const isOutgoing = item.caller_id === user?.id;
        const otherProfile = isOutgoing ? item.receiver : item.caller;
        const date = new Date(item.created_at);

        return (
            <TouchableOpacity
                style={styles.callItem}
                onPress={() => handleCallPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.avatarContainer}>
                    {otherProfile?.photos?.[0] ? (
                        <Image
                            source={{ uri: otherProfile.photos[0] }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatar, styles.placeholderAvatar]}>
                            <Ionicons name="person" size={24} color="#555" />
                        </View>
                    )}
                    <View style={[styles.callTypeIcon, { backgroundColor: item.status === 'missed' ? '#FF4458' : '#87CEEB' }]}>
                        <Ionicons
                            name={item.call_type === 'video' ? "videocam" : "call"}
                            size={10}
                            color="#000"
                        />
                    </View>
                </View>

                <View style={styles.callInfo}>
                    <Text style={[styles.name, { color: getGenderColor(otherProfile?.gender) }]} numberOfLines={1}>
                        {otherProfile?.display_name || 'Gossip Member'}
                    </Text>
                    <View style={styles.detailsRow}>
                        <Ionicons
                            name={isOutgoing ? "arrow-up-outline" : "arrow-down-outline"}
                            size={14}
                            color={item.status === 'missed' ? "#FF4458" : "#888"}
                        />
                        <Text style={[styles.time, item.status === 'missed' && { color: '#FF4458' }]}>
                            {item.status === 'missed' ? 'Missed Call' : format(date, 'MMM d, h:mm a')}
                        </Text>
                    </View>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleCallPress(item, 'voice')}
                    >
                        <Ionicons name="call" size={20} color="#87CEEB" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleCallPress(item, 'video')}
                    >
                        <Ionicons name="videocam" size={20} color="#87CEEB" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: '#000', paddingTop: insets.top }]}>
            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 : 0 }]}>
                <GradientText style={styles.headerTitle}>Calls</GradientText>
            </View>

            <FlatList
                data={calls}
                renderItem={renderCallItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#87CEEB" />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="call-outline" size={50} color="rgba(135,206,235,0.15)" />
                            </View>
                            <Text style={styles.emptyText}>No recent calls</Text>
                            <Text style={styles.emptySubtext}>Your elite voice & video logs will appear here.</Text>
                        </View>
                    ) : null
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitle: {
        ...Typography.header,
    },
    listContent: {
        padding: 20,
        flexGrow: 1,
    },
    callItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 15,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 18,
    },
    placeholderAvatar: {
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    callTypeIcon: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },
    callInfo: {
        flex: 1,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    time: {
        fontSize: 13,
        color: '#888',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(135, 206, 235, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(135, 206, 235, 0.2)',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    emptySubtext: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '500',
    },
});
