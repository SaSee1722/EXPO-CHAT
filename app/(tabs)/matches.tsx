import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useAuth } from '@/template';
import { useMatches } from '@/hooks/useMatches';
import { Spacing, Typography, Shadows } from '@/constants/theme';
import { MatchItem } from '@/components/matches/MatchItem';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';
import { Ionicons } from '@expo/vector-icons';

export default function MatchesScreen() {
  const { user } = useAuth();
  const { matches, loading, reload } = useMatches(user?.id || null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = React.useState(false);

  // Force reload when screen comes into focus to ensure sync
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return (
    <View style={[styles.container, { backgroundColor: '#000000', paddingTop: insets.top }]}>
      <View style={styles.header}>
        <GradientText style={styles.title}>Matches</GradientText>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MatchItem
            match={item}
            onPress={() => router.push({
              pathname: '/chat/[matchId]',
              params: {
                matchId: item.id,
                name: item.profile?.display_name,
                gender: item.profile?.gender
              }
            })}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles" size={64} color="rgba(135,206,235,0.15)" />
              </View>
              <Text style={styles.emptyText}>Find your elite circle</Text>
              <Text style={styles.emptySubtext}>Matches will appear here once you both like each other.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#87CEEB" />}
        showsVerticalScrollIndicator={false}
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
    ...Shadows.small,
  },
  title: {
    ...Typography.h2,
  },
  listContent: {
    padding: Spacing.md,
    flexGrow: 1,
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
    backgroundColor: 'rgba(135,206,235,0.03)',
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
