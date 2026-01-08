import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl, Image as RNImage } from 'react-native';
import { useAuth, useAlert } from '@/template';
import { useProfileContext } from '@/context/ProfileContext';
import { Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { profile, uploadPhoto, updateProfile, refreshProfile } = useProfileContext();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

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

  useEffect(() => {
    if (remoteUrl) {
      if (Platform.OS === 'web') {
        setLocalImageUri(remoteUrl);
        return;
      }

      const downloadToCache = async () => {
        try {
          const localPath = `${FileSystem.cacheDirectory}avatar_${Date.now()}.jpg`;
          const result = await FileSystem.downloadAsync(remoteUrl, localPath);

          if (result.status === 200) {
            setLocalImageUri(result.uri);
          }
        } catch (e) {
          console.error('[ProfileUI] Sync Error:', e);
        }
      };
      downloadToCache();
    } else {
      setLocalImageUri(null);
    }
  }, [remoteUrl]);

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
          showAlert('Upload failed. Try picking a smaller image or checking Supabase connection.');
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

  return (
    <View style={[styles.container, { backgroundColor: '#000000', paddingTop: insets.top }]}>
      <View style={styles.header}><GradientText style={styles.title}>Profile</GradientText></View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#87CEEB" />}
      >
        {profile ? (
          <>
            <View style={styles.avatarSection}>
              <View style={styles.avatarOuterContainer}>
                <TouchableOpacity onPress={handleUpdatePhoto} disabled={updatingPhoto} activeOpacity={0.8}>
                  <View style={styles.avatarWrapper}>
                    {localImageUri ? (
                      <RNImage
                        source={{ uri: localImageUri }}
                        style={styles.avatarInnerImage}
                        key={localImageUri}
                      />
                    ) : (
                      <View style={styles.placeholderContainer}>
                        <Ionicons name="person" size={80} color="#000" />
                      </View>
                    )}
                    {updatingPhoto && <View style={styles.uploadingOverlay}><ActivityIndicator color="#FFF" size="large" /></View>}
                  </View>
                  <View style={styles.cameraCircle}><Ionicons name="camera" size={20} color="#FFF" /></View>
                </TouchableOpacity>
              </View>

              <Text style={styles.displayName}>{profile.display_name}</Text>
              <Text style={styles.ageText}>{profile.age} years old</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Ionicons name="mail" size={20} color="#87CEEB" style={styles.icon} />
                <View>
                  <Text style={styles.infoLabel}>EMAIL</Text>
                  <Text style={styles.infoValue}>{user?.email}</Text>
                </View>
              </View>

              {profile.location && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color="#FFB6C1" style={styles.icon} />
                  <View>
                    <Text style={styles.infoLabel}>LOCATION</Text>
                    <Text style={styles.infoValue}>{profile.location}</Text>
                  </View>
                </View>
              )}

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="document-text" size={20} color="#87CEEB" style={styles.icon} />
                <View>
                  <Text style={styles.infoLabel}>BIO</Text>
                  <Text style={styles.bioText}>{profile.bio || 'No bio yet'}</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={{ paddingTop: 100 }}>
            <ActivityIndicator color="#87CEEB" size="large" />
          </View>
        )}

        <Button title="Logout" onPress={() => logout()} variant="outline" style={styles.logoutButton} textStyle={{ color: '#FF4458' }} />
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  content: { paddingHorizontal: Spacing.lg },
  avatarSection: { alignItems: 'center', marginVertical: Spacing.xl },
  avatarOuterContainer: { width: 160, height: 160, position: 'relative' },
  avatarWrapper: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: '#87CEEB',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 4, borderColor: '#87CEEB',
  },
  avatarInnerImage: { width: '100%', height: '100%' },
  placeholderContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  cameraCircle: {
    position: 'absolute', bottom: 8, right: 8, backgroundColor: '#87CEEB', width: 44, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#000', zIndex: 11,
  },
  displayName: { fontSize: 28, fontWeight: '800', color: '#FFF', marginTop: 15 },
  ageText: { fontSize: 16, color: '#808080', marginTop: 5 },
  card: { backgroundColor: '#0A0A0A', borderRadius: 25, padding: 20, marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.1)' },
  icon: { marginRight: 15, width: 22 },
  infoLabel: { fontSize: 10, color: '#666', fontWeight: 'bold', marginBottom: 2 },
  infoValue: { fontSize: 16, color: '#FFF', fontWeight: '600' },
  bioText: { fontSize: 15, color: '#BBB', lineHeight: 22 },
  logoutButton: { marginTop: 40, height: 55, borderRadius: 15 },
});
