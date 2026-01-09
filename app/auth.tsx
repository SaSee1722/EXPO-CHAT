import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useAlert } from '@/template';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GradientText } from '@/components/GradientText';

export default function AuthScreen() {
  const { signUpWithPassword, signInWithPassword, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      showAlert('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      showAlert('Passwords do not match');
      return;
    }

    const { error, needsEmailConfirmation } = await signUpWithPassword(email, password);

    if (error) {
      showAlert(error);
    } else if (needsEmailConfirmation) {
      showAlert('Confirmation email sent! Please check your inbox and click the link to verify your account.');
      setMode('login');
    } else {
      router.replace('/setup-profile');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Please enter email and password');
      return;
    }

    const { error } = await signInWithPassword(email, password);
    if (error) {
      showAlert(error);
    } else {
      router.replace('/');
    }
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <GradientText style={styles.title}>GOSSIP</GradientText>
            <View style={styles.subtitleContainer}>
              <View style={styles.line} />
              <Text style={styles.subtitle}>
                REFINED FOR THE ELITE
              </Text>
              <View style={styles.line} />
            </View>
          </View>

          <View style={styles.glassCard}>
            <View style={styles.tabsContainer}>
              <View style={[styles.tabIndicator, {
                left: mode === 'login' ? '1%' : '50%'
              }]} />
              <TouchableOpacity
                style={styles.tab}
                onPress={() => {
                  setMode('login');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => {
                  setMode('signup');
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#87CEEB" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: '#FFFFFF' }]}
                  placeholder="Email Address"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {mode === 'signup' && (
                <>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#87CEEB" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: '#FFFFFF' }]}
                      placeholder="Create Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#87CEEB" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: '#FFFFFF' }]}
                      placeholder="Confirm Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                  </View>

                  <Button
                    title="Create Account"
                    onPress={handleSignUp}
                    loading={operationLoading}
                    style={styles.primaryButton}
                  />
                </>
              )}

              {mode === 'login' && (
                <>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#87CEEB" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: '#FFFFFF' }]}
                      placeholder="Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>

                  <Button
                    title="Login"
                    onPress={handleLogin}
                    loading={operationLoading}
                    style={styles.primaryButton}
                  />
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
              </Text>
              <Button
                title={mode === 'login' ? "Sign Up" : "Login"}
                onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
                variant="ghost"
                textStyle={styles.footerLink}
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
    paddingTop: Platform.OS === 'ios' ? 80 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 80,
    height: 80,
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    backgroundColor: '#87CEEB',
    borderRadius: 40,
    opacity: 0.15,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 10,
    color: '#FFFFFF',
    includeFontPadding: false,
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
    fontSize: 11,
    letterSpacing: 4,
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 14,
    padding: 0,
    marginBottom: 28,
    position: 'relative',
    height: 52,
  },
  tabIndicator: {
    position: 'absolute',
    width: '49%',
    height: '88%',
    backgroundColor: 'rgba(135, 206, 235, 0.22)',
    borderRadius: 12,
    top: '6%',
    borderWidth: 0.5,
    borderColor: 'rgba(135, 206, 235, 0.3)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputGroup: {
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
  inputIcon: {
    marginRight: 14,
    opacity: 0.8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    gap: 8,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
    fontWeight: '500',
  },
  footerLink: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '700',
  },
});
