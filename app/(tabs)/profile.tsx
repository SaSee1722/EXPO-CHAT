import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useAuth, useAlert } from '@/template';
import { useProfileContext } from '@/context/ProfileContext';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { profile, uploadPhoto, updateProfile, refreshProfile } = useProfileContext();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    setRefreshing(false);
  }, [refreshProfile]);

  const remoteUrl = useMemo(() => {
    const photos = profile?.photos;
    if (!photos) return null;
    return Array.isArray(photos) ? photos[0] : (typeof photos === 'string' ? photos : null);
  }, [profile?.photos]);

  const handleUpdatePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setUpdatingPhoto(true);
        const { data: photoUrl, error: uploadError } = await uploadPhoto(result.assets[0].uri);

        if (uploadError) {
          setUpdatingPhoto(false);
          showAlert('Upload failed. Try picking a smaller image.');
          return;
        }

        if (photoUrl) {
          await updateProfile({ photos: [photoUrl] });
          await refreshProfile();
        }
        setUpdatingPhoto(false);
      }
    } catch {
      setUpdatingPhoto(false);
      showAlert('Error picking photo');
    }
  };

  const CardWrapper = Platform.OS === 'ios' ? BlurView : View;

  return (
    <View style={[styles.container, { backgroundColor: '#000000', paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 : 0 }]}>
        <GradientText style={styles.title}>Profile</GradientText>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#87CEEB" />}
      >
        {profile ? (
          <>
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarContainer} onPress={handleUpdatePhoto} disabled={updatingPhoto} activeOpacity={0.9}>
                <View style={styles.avatarOuterRing}>
                  <View style={styles.avatarInnerContainer}>
                    {remoteUrl ? (
                      <Image source={{ uri: remoteUrl }} style={styles.avatarImage} contentFit="cover" transition={200} />
                    ) : (
                      <View style={styles.placeholderContainer}>
                        <Ionicons name="person" size={50} color="rgba(255,255,255,0.2)" />
                      </View>
                    )}
                    {updatingPhoto && <View style={styles.uploadingOverlay}><ActivityIndicator color="#FFF" /></View>}
                  </View>
                </View>
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={16} color="#000" />
                </View>
              </TouchableOpacity>

              <Text style={styles.displayName}>{profile.display_name}</Text>
              <Text style={styles.ageText}>{profile.age} years old • Refined Member</Text>
            </View>

            <View style={styles.statsRow}>
              <StatItem label="Status" value="Exclusive" color="#87CEEB" />
              <View style={styles.statDivider} />
              <StatItem label="Identity" value="Verified" color="#FFB6C1" />
            </View>

            <CardWrapper intensity={20} tint="dark" style={[styles.infoCard, Platform.OS === 'android' && styles.androidCard]}>
              <InfoRow icon="mail" label="EMAIL" value={user?.email || 'Not set'} color="#87CEEB" />
              <InfoRow icon="location" label="LOCATION" value={profile.location || 'Not set'} color="#FFB6C1" />
              <InfoRow icon="document-text" label="BIO" value={profile.bio || 'No bio yet'} color="#87CEEB" last />
            </CardWrapper>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
              <Text style={styles.logoutBtnText}>Logout Account</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#87CEEB" size="large" />
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value, color, last }: { icon: any, label: string, value: string, color: string, last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.infoIconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingVertical: Spacing.md, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: Platform.OS === 'android' ? '700' : '900', letterSpacing: Platform.OS === 'android' ? 8 : 10 },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: { position: 'relative' },
  avatarOuterRing: { width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', padding: 4 },
  avatarInnerContainer: { width: '100%', height: '100%', borderRadius: 66, backgroundColor: '#0A0A0A', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  avatarImage: { width: '100%', height: '100%' },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: '#87CEEB', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },
  displayName: { fontSize: 28, fontWeight: '800', color: '#FFF', marginTop: 20, letterSpacing: 0.5 },
  ageText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6, fontWeight: '600', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, paddingVertical: 18, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: '800' },
  statDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.05)', alignSelf: 'center' },
  infoCard: { borderRadius: 32, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  androidCard: { backgroundColor: 'rgba(255,255,255,0.04)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  infoIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#FFF', fontWeight: '600' },
  logoutBtn: { marginTop: 32, height: 64, borderRadius: 24, backgroundColor: 'rgba(255, 68, 88, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 68, 88, 0.1)', justifyContent: 'center', alignItems: 'center' },
  logoutBtnText: { color: '#FF4458', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  loadingContainer: { paddingTop: 100 },
});
