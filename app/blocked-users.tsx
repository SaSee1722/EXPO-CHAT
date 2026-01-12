import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/template';
import { matchService } from '@/services/matchService';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';
import { Colors, Typography, Shadows, Spacing, BorderRadius, getGenderColor } from '@/constants/theme';

interface BlockedUser {
    id: string;
    blocked_id: string;
    created_at: string;
    profile?: {
        id: string;
        display_name: string;
        photos: string[];
        gender?: string;
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
                    .select('id, display_name, photos, gender')
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
                    <Text style={[styles.userName, { color: getGenderColor(item.profile?.gender) }]}>{displayName}</Text>
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
        ...Shadows.small,
    },
    backButton: {
        padding: 4,
    },
    title: {
        ...Typography.h3,
        color: '#FFF',
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
        borderRadius: BorderRadius.md,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        ...Shadows.small,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 77, 77, 0.3)',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        ...Typography.body,
        fontWeight: '700',
        marginBottom: 2,
    },
    blockedDate: {
        ...Typography.caption,
        color: '#888',
    },
    unblockButton: {
        backgroundColor: '#87CEEB',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: BorderRadius.round,
    },
    unblockText: {
        ...Typography.caption,
        color: '#000',
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
        backgroundColor: 'rgba(135, 206, 235, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyText: {
        ...Typography.h3,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptySubtext: {
        ...Typography.body,
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
    },
});
