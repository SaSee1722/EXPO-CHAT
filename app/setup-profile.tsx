import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAlert } from '@/template';
import { useProfileContext } from '@/context/ProfileContext';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientText } from '@/components/GradientText';
import { Image } from 'expo-image';

export default function SetupProfileScreen() {
  const { profile, createProfile, uploadPhoto } = useProfileContext();
  const { showAlert } = useAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      router.replace('/(tabs)');
    }
  }, [profile, router]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleComplete = async () => {
    if (!displayName || !age) {
      showAlert('Please enter your name and age');
      return;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      showAlert('Please enter a valid age (18-99)');
      return;
    }

    setLoading(true);

    let photoUrls: string[] = [];
    if (photoUri) {
      const { data, error: uploadError } = await uploadPhoto(photoUri);
      if (uploadError) {
        console.warn('Photo upload failed:', uploadError);
        showAlert('Photo upload failed. Please ensure your "profile-photos" bucket is Public.');
      } else if (data) {
        photoUrls = [data];
      }
    }

    const { error } = await createProfile({
      display_name: displayName,
      age: ageNum,
      bio,
      location,
      photos: photoUrls,
    });

    if (error) {
      const errorMessage = typeof error === 'string' ? error : error.message;
      showAlert(errorMessage || 'Failed to create profile');
    } else {
      router.replace('/(tabs)');
    }
    setLoading(false);
  };

  return (
    <LinearGradient
      colors={['#050505', '#1a1a1a', '#050505']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              <View style={styles.logoContainer}>
                {photoUri ? (
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={photoUri}
                      style={styles.avatarImage}
                      contentFit="cover"
                      transition={300}
                    />
                    <View style={styles.photoHintContainer}>
                      <Text style={styles.photoHint}>Tap to Change</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Ionicons name="person-circle-outline" size={84} color="#87CEEB" />
                    <View style={styles.cameraBadge}>
                      <Ionicons name="camera" size={14} color="#000" />
                    </View>
                  </View>
                )}
                <View style={[styles.logoGlow, { backgroundColor: photoUri ? 'transparent' : '#87CEEB' }]} />
              </View>
            </TouchableOpacity>
            <GradientText style={styles.title}>MY PROFILE</GradientText>
            <View style={styles.subtitleContainer}>
              <View style={styles.line} />
              <Text style={styles.subtitle}>
                COMPLETE YOUR IDENTITY
              </Text>
              <View style={styles.line} />
            </View>
          </View>

          <View style={styles.glassCard}>
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#87CEEB" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Display Name *"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={20} color="#87CEEB" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Age *"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color="#87CEEB" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Location"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <Ionicons name="document-text-outline" size={20} color="#87CEEB" style={[styles.inputIcon, { marginTop: 18 }]} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Tell something about yourself..."
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <Button
                title="Complete Profile"
                onPress={handleComplete}
                loading={loading}
                style={styles.primaryButton}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  placeholderContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#87CEEB',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.15,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#87CEEB',
    zIndex: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  photoHintContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
  },
  photoHint: {
    fontSize: 8,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 10,
  },
  line: {
    height: 1,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 3,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
    marginHorizontal: 16,
    textAlign: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 8,
  },
  form: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 58,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  textAreaWrapper: {
    height: 120,
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 14,
    opacity: 0.8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  textArea: {
    paddingTop: 18,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#87CEEB',
    height: 58,
    borderRadius: 16,
    marginTop: 12,
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
});
