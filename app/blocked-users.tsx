import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { matchService } from '@/services/matchService';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';

interface BlockedUser {
    id: string;
    blocked_id: string;
    created_at: string;
    profile?: {
        id: string;
        display_name: string;
        photos: string[];
    };
}

export default function BlockedUsersScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadBlockedUsers = useCallback(async () => {
        if (!user?.id) return;

        try {
            const supabase = matchService.getSupabaseClient();

            // Fetch blocks with profile data
            const { data: blocks, error } = await supabase
                .from('blocks')
                .select('id, blocked_id, created_at')
                .eq('blocker_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch profiles for blocked users
            if (blocks && blocks.length > 0) {
                const blockedIds = blocks.map(b => b.blocked_id);
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, display_name, photos')
                    .in('id', blockedIds);

                const enrichedBlocks = blocks.map(block => ({
                    ...block,
                    profile: profiles?.find(p => p.id === block.blocked_id)
                }));

                setBlockedUsers(enrichedBlocks);
            } else {
                setBlockedUsers([]);
            }
        } catch (error) {
            console.error('Error loading blocked users:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadBlockedUsers();
    }, [loadBlockedUsers]);

    const handleUnblock = (blockedUserId: string, displayName: string) => {
        Alert.alert(
            'Unblock User',
            `Are you sure you want to unblock ${displayName}? They will be able to see your profile and message you again.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unblock',
                    style: 'default',
                    onPress: async () => {
                        if (!user?.id) return;

                        const { error } = await matchService.unblockUser(user.id, blockedUserId);

                        if (!error) {
                            setBlockedUsers(prev => prev.filter(b => b.blocked_id !== blockedUserId));
                        } else {
                            Alert.alert('Error', 'Failed to unblock user. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadBlockedUsers();
    }, [loadBlockedUsers]);

    const renderBlockedUser = ({ item }: { item: BlockedUser }) => {
        const photoUrl = item.profile?.photos?.[0] || 'https://via.placeholder.com/60/FF4458/FFFFFF?text=User';
        const displayName = item.profile?.display_name || 'Unknown User';

        return (
            <View style={styles.userCard}>
                <Image source={{ uri: photoUrl }} style={styles.avatar} contentFit="cover" />
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.blockedDate}>
                        Blocked {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => handleUnblock(item.blocked_id, displayName)}
                    style={styles.unblockButton}
                >
                    <Text style={styles.unblockText}>Unblock</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <GradientText style={styles.title}>Blocked Users</GradientText>
                <View style={styles.placeholder} />
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#87CEEB" />
                </View>
            ) : (
                <FlatList
                    data={blockedUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBlockedUser}
                    contentContainerStyle={styles.listContent}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="shield-checkmark-outline" size={64} color="rgba(135, 206, 235, 0.3)" />
                            </View>
                            <Text style={styles.emptyText}>No Blocked Users</Text>
                            <Text style={styles.emptySubtext}>
                                Users you block will appear here. You can unblock them anytime.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 1,
    },
    placeholder: {
        width: 36,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        flexGrow: 1,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: 'rgba(255, 77, 77, 0.4)',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    blockedDate: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
    },
    unblockButton: {
        backgroundColor: '#87CEEB',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    unblockText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '700',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptySubtext: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        fontWeight: '500',
    },
});
