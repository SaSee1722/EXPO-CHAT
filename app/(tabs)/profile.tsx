import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl, Modal, Switch, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useAuth, useAlert } from '@/template';
import { useProfileContext } from '@/context/ProfileContext';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientText } from '@/components/GradientText';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { profile, uploadPhoto, updateProfile, refreshProfile } = useProfileContext();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedAge, setEditedAge] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [saving, setSaving] = useState(false);

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
        quality: 0.5, // Balanced quality - compresses most photos under 200KB
      });

      if (!result.canceled && result.assets[0].uri) {
        setUpdatingPhoto(true);
        const { data: photoUrl, error: uploadError } = await uploadPhoto(result.assets[0].uri);

        if (uploadError) {
          setUpdatingPhoto(false);
          console.error('[Profile] Photo upload error:', uploadError);
          showAlert('Failed to upload photo. Please try again.');
          return;
        }

        if (photoUrl) {
          // Update profile with new photo URL
          const { error: updateError } = await updateProfile({ photos: [photoUrl] });

          if (updateError) {
            setUpdatingPhoto(false);
            console.error('[Profile] Profile update error:', updateError);
            showAlert('Failed to update profile. Please try again.');
            return;
          }

          // Refresh profile to get latest data
          await refreshProfile();
        }
        setUpdatingPhoto(false);
      }
    } catch {
      setUpdatingPhoto(false);
      showAlert('Error picking photo');
    }
  };

  const handleEdit = () => {
    setEditedName(profile?.display_name || '');
    setEditedAge(profile?.age?.toString() || '');
    setEditedBio(profile?.bio || '');
    setEditedLocation(profile?.location || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editedName.trim()) {
      showAlert('Name cannot be empty');
      return;
    }
    const age = parseInt(editedAge);
    if (isNaN(age) || age < 18 || age > 100) {
      showAlert('Please enter a valid age (18-100)');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        display_name: editedName.trim(),
        age: age,
        bio: editedBio.trim(),
        location: editedLocation.trim(),
      });
      await refreshProfile();
      setIsEditing(false);
    } catch (error) {
      showAlert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const CardWrapper = Platform.OS === 'ios' ? BlurView : View;

  return (
    <View style={[styles.container, { backgroundColor: '#000000', paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 : 0 }]}>
        <View style={{ width: 40 }} />
        <GradientText style={styles.title}>Profile</GradientText>
        {!isEditing ? (
          <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color="#87CEEB" />
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.cancelButton}>
              <Ionicons name="close" size={20} color="#FF4458" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="checkmark" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#87CEEB" />}
      >
        {profile ? (
          <>
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  onPress={() => remoteUrl && setIsImageViewerVisible(true)}
                  activeOpacity={0.9}
                  disabled={!remoteUrl}
                >
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
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editBadge}
                  onPress={handleUpdatePhoto}
                  disabled={updatingPhoto}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={16} color="#000" />
                </TouchableOpacity>
              </View>

              {isEditing ? (
                <>
                  <TextInput
                    style={styles.editNameInput}
                    value={editedName}
                    onChangeText={setEditedName}
                    placeholder="Display Name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    maxLength={30}
                  />
                  <View style={styles.ageInputContainer}>
                    <TextInput
                      style={styles.editAgeInput}
                      value={editedAge}
                      onChangeText={setEditedAge}
                      placeholder="Age"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                    <Text style={styles.ageText}>years old • Refined Member</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.displayName}>{profile.display_name}</Text>
                  <Text style={styles.ageText}>{profile.age} years old • Refined Member</Text>
                </>
              )}
            </View>

            <CardWrapper intensity={20} tint="dark" style={[styles.infoCard, Platform.OS === 'android' && styles.androidCard]}>
              <InfoRow icon="mail" label="EMAIL" value={user?.email || 'Not set'} color="#87CEEB" />

              {isEditing ? (
                <>
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIconBox, { backgroundColor: '#FFB6C115' }]}>
                      <Ionicons name="location" size={18} color="#FFB6C1" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>LOCATION</Text>
                      <TextInput
                        style={styles.editBioInput}
                        value={editedLocation}
                        onChangeText={setEditedLocation}
                        placeholder="Add location"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        maxLength={50}
                        numberOfLines={1}
                        multiline={false}
                      />
                    </View>
                  </View>

                  <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <View style={[styles.infoIconBox, { backgroundColor: '#87CEEB15' }]}>
                      <Ionicons name="document-text" size={18} color="#87CEEB" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>BIO</Text>
                      <TextInput
                        style={styles.editBioInput}
                        value={editedBio}
                        onChangeText={setEditedBio}
                        placeholder="Tell us about yourself..."
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        multiline
                        maxLength={200}
                        numberOfLines={3}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <InfoRow icon="location" label="LOCATION" value={profile.location || 'Not set'} color="#FFB6C1" />
                  <InfoRow icon="document-text" label="BIO" value={profile.bio || 'No bio yet'} color="#87CEEB" last />
                </>
              )}
            </CardWrapper>

            <View style={styles.visibilityCard}>
              <View style={styles.visibilityInfo}>
                <View style={[styles.infoIconBox, { backgroundColor: 'rgba(135, 206, 235, 0.15)' }]}>
                  <Ionicons name={profile.is_public !== false ? "eye" : "eye-off"} size={18} color="#87CEEB" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>PROFILE VISIBILITY</Text>
                  <Text style={styles.infoValue}>{profile.is_public !== false ? 'Public' : 'Private'}</Text>
                  <Text style={styles.visibilitySubtext}>
                    {profile.is_public !== false
                      ? 'Everyone can discover and match with you.'
                      : 'You are hidden from the discovery feed.'}
                  </Text>
                </View>
              </View>
              <Switch
                value={profile.is_public !== false}
                onValueChange={(value) => { updateProfile({ is_public: value }); }}
                trackColor={{ false: '#333', true: '#87CEEB' }}
                thumbColor={Platform.OS === 'ios' ? '#FFF' : (profile.is_public !== false ? '#FFF' : '#666')}
              />
            </View>

            <TouchableOpacity
              style={styles.blockedUsersBtn}
              onPress={() => router.push('/blocked-users')}
              activeOpacity={0.8}
            >
              <View style={styles.blockedUsersBtnContent}>
                <View style={styles.blockedUsersIconBox}>
                  <Ionicons name="shield-checkmark" size={20} color="#87CEEB" />
                </View>
                <Text style={styles.blockedUsersBtnText}>Blocked Users</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>

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

      {/* Profile Picture Viewer */}
      {remoteUrl && (
        <Modal
          visible={isImageViewerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsImageViewerVisible(false)}
        >
          <View style={styles.imageViewerContainer}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => setIsImageViewerVisible(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
            <Image
              source={{ uri: remoteUrl }}
              style={styles.imageViewerImage}
              contentFit="contain"
            />
          </View>
        </Modal>
      )}
    </View >
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
  header: {
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 68, 88, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#87CEEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { ...Typography.header },
  editNameInput: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 20,
    letterSpacing: 0.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
    textAlign: 'center',
  },
  ageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    gap: 8,
  },
  editAgeInput: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
    minWidth: 50,
    textAlign: 'center',
  },
  editBioInput: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.3)',
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
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
  infoCard: { borderRadius: 32, padding: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', marginBottom: 24 },
  androidCard: { backgroundColor: 'rgba(255,255,255,0.04)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  infoIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#FFF', fontWeight: '600' },
  blockedUsersBtn: {
    marginTop: 24,
    height: 64,
    borderRadius: 24,
    backgroundColor: 'rgba(135, 206, 235, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(135, 206, 235, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20
  },
  blockedUsersBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockedUsersIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(135, 206, 235, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  blockedUsersBtnText: {
    color: '#87CEEB',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoutBtn: { marginTop: 32, height: 64, borderRadius: 24, backgroundColor: 'rgba(255, 68, 88, 0.05)', borderWidth: 2, borderColor: 'rgba(255, 68, 88, 0.3)', justifyContent: 'center', alignItems: 'center' },
  logoutBtnText: { color: '#FF4458', fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },
  loadingContainer: { paddingTop: 100 },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 32,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 24,
  },
  visibilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  visibilitySubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
    fontWeight: '500',
  },
  imageViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: '100%',
    height: '100%',
  },
});
