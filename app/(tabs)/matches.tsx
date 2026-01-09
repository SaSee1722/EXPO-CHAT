import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, useColorScheme, Platform, RefreshControl } from 'react-native';
import { useAuth } from '@/template';
import { useMatches } from '@/hooks/useMatches';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MatchItem } from '@/components/matches/MatchItem';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';
import { Ionicons } from '@expo/vector-icons';

export default function MatchesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 : 0 }]}>
        <GradientText style={styles.title}>Matches</GradientText>
      </View>

      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MatchItem
            match={item}
            onPress={() => router.push(`/chat/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles" size={64} color="rgba(255,182,193,0.15)" />
              </View>
              <Text style={styles.emptyText}>Find your elite circle</Text>
              <Text style={styles.emptySubtext}>Matches will appear here once you both like each other.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#87CEEB" />}
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
  title: {
    fontSize: 28,
    fontWeight: Platform.OS === 'android' ? '700' : '900',
    letterSpacing: Platform.OS === 'android' ? 8 : 10,
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
