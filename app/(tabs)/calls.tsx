import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Platform } from 'react-native';
import React, { useState, useCallback } from 'react';
import { useAuth, getSupabaseClient } from '@/template';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { Spacing } from '@/constants/theme';
import { callService } from '@/services/callService';
import { webrtcService } from '@/services/webrtcService';
import { useNotifications } from '@/context/NotificationContext';
import { GradientText } from '@/components/GradientText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CallRecord {
    id: string;
    created_at: string;
    caller_id: string;
    receiver_id: string;
    match_id: string;
    status: string;
    call_type: 'voice' | 'video';
    duration?: number;
    profile?: any;
}

export default function CallsScreen() {
    const { user } = useAuth();
    const [calls, setCalls] = useState<CallRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const { setActiveCall, setCallOtherProfile, setIsCallIncoming } = useNotifications();
    const insets = useSafeAreaInsets();
    const loadCalls = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const supabase = getSupabaseClient();

        try {
            const { data: callData, error } = await supabase
                .from('calls')
                .select(`
          *,
          user1:profiles!caller_id(id, display_name, photos),
          user2:profiles!receiver_id(id, display_name, photos)
        `)
                .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Extract the other person's profile for each call
            const enrichedCalls = (callData || []).map((call: any) => {
                const otherUser = call.caller_id === user.id ? call.user2 : call.user1;
                return {
                    ...call,
                    profile: otherUser
                };
            });

            setCalls(enrichedCalls);
        } catch (err: any) {
            // Soften log for network failures to avoid red screen overlays
            if (err?.message?.includes('Network')) {
                console.warn('[Calls] Network Issue:', err.message);
            } else {
                console.error('[Calls] Error loading calls:', err);
            }
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadCalls();
        }, [loadCalls])
    );

    const handleCallPress = async (callRecord: CallRecord) => {
        if (!user || !callRecord.profile) return;

        // Initiate a new call to the same person with the same call type
        const { data, error } = await callService.initiateCall(
            callRecord.match_id,
            user.id,
            callRecord.caller_id === user.id ? callRecord.receiver_id : callRecord.caller_id,
            callRecord.call_type
        );

        if (!error && data) {
            // 1. Initialize counseling/signaling channels FIRST
            await webrtcService.initialize(user.id, data.match_id);

            // 2. Broadcast the start event
            webrtcService.notifyCallStarted(data);

            // 3. Update global UI state
            setCallOtherProfile(callRecord.profile);
            setActiveCall(data);
            setIsCallIncoming(false);
        }
    };

    const renderCallItem = ({ item }: { item: CallRecord }) => {
        const isOutgoing = item.caller_id === user?.id;
        const photoUrl = item.profile?.photos?.[0] || 'https://via.placeholder.com/60/333/fff?text=User';
        const date = new Date(item.created_at);

        return (
            <View style={styles.callItem}>
                <Image source={{ uri: photoUrl }} style={styles.avatar} />
                <View style={styles.callInfo}>
                    <Text style={styles.name}>{item.profile?.display_name || 'Gossip User'}</Text>
                    <View style={styles.detailsRow}>
                        <Ionicons
                            name={isOutgoing ? "arrow-up-outline" : "arrow-down-outline"}
                            size={14}
                            color={item.status === 'rejected' ? '#FF4458' : '#4CAF50'}
                        />
                        <Text style={styles.time}>
                            {format(date, 'MMM d, h:mm a')}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => handleCallPress(item)}>
                    <Ionicons
                        name={item.call_type === 'video' ? "videocam" : "call"}
                        size={24}
                        color="#87CEEB"
                    />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 : 0 }]}>
                <GradientText style={styles.headerTitle}>Calls</GradientText>
            </View>

            <FlatList
                data={calls}
                renderItem={renderCallItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="call-outline" size={64} color="#333" />
                            <Text style={styles.emptyText}>No recent calls</Text>
                        </View>
                    ) : null
                }
                onRefresh={loadCalls}
                refreshing={loading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        paddingVertical: Spacing.md,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#1A1A1A',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: Platform.OS === 'android' ? '700' : '900',
        letterSpacing: 2,
    },
    listContent: {
        padding: 20,
    },
    callItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#111',
        padding: 15,
        borderRadius: 15,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    callInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    time: {
        fontSize: 12,
        color: '#888',
    },
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        opacity: 0.5,
    },
    emptyText: {
        color: '#FFF',
        marginTop: 10,
        fontSize: 16,
    },
});
