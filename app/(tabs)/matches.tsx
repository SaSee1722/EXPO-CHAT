import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, useColorScheme } from 'react-native';
import { useAuth } from '@/template';
import { useMatches } from '@/hooks/useMatches';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MatchItem } from '@/components/matches/MatchItem';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';

export default function MatchesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const { matches, loading, reload } = useMatches(user?.id || null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Force reload when screen comes into focus to ensure sync
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <View style={[styles.container, { backgroundColor: '#000000', paddingTop: insets.top }]}>
      <View style={styles.header}>
        <GradientText style={styles.title}>Matches</GradientText>
      </View>

      <View style={styles.cardContainer}>
        {!loading && matches.length === 0 ? (
          <View style={[styles.card, { backgroundColor: '#1A1A1A' }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No matches yet. Start swiping!
            </Text>
          </View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MatchItem
                match={item}
                onPress={() => router.push(`/chat/${item.id}`)}
              />
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </View>
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
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  cardContainer: {
    flex: 1,
    padding: Spacing.md,
  },
  card: {
    borderRadius: 24,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  list: {
    padding: Spacing.md,
  },
  emptyText: {
    ...Typography.h3,
    textAlign: 'center',
  },
});
