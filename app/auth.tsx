import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useAlert } from '@/template';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GradientText } from '@/components/GradientText';
import { BlurView } from 'expo-blur';
import MAnimated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const { signUpWithPassword, signInWithPassword, operationLoading } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const logoOffset = useSharedValue(0);
  useEffect(() => {
    logoOffset.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 2500 }),
        withTiming(0, { duration: 2500 })
      ),
      -1,
      true
    );
  }, []);

  const logoFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoOffset.value }]
  }));

  // Reanimated background movement
  const bubble1X = useSharedValue(0);
  const bubble1Y = useSharedValue(0);
  const bubble2X = useSharedValue(0);
  const bubble2Y = useSharedValue(0);

  useEffect(() => {
    bubble1X.value = withRepeat(withSequence(withTiming(width * 0.15, { duration: 15000 }), withTiming(-width * 0.15, { duration: 15000 })), -1, true);
    bubble1Y.value = withRepeat(withSequence(withTiming(height * 0.08, { duration: 18000 }), withTiming(-height * 0.08, { duration: 18000 })), -1, true);
    bubble2X.value = withRepeat(withSequence(withTiming(-width * 0.2, { duration: 20000 }), withTiming(width * 0.2, { duration: 20000 })), -1, true);
    bubble2Y.value = withRepeat(withSequence(withTiming(height * 0.12, { duration: 14000 }), withTiming(-height * 0.12, { duration: 14000 })), -1, true);
  }, []);

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
      showAlert('Confirmation email sent! Please check your inbox.');
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

  const bubble1Style = useAnimatedStyle(() => ({ transform: [{ translateX: bubble1X.value }, { translateY: bubble1Y.value }] }));
  const bubble2Style = useAnimatedStyle(() => ({ transform: [{ translateX: bubble2X.value }, { translateY: bubble2Y.value }] }));

  const CardWrapper = Platform.OS === 'ios' ? BlurView : View;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#050505', '#0a0a0c', '#050505']} style={StyleSheet.absoluteFill} />

      {/* Animated Orbs */}
      <MAnimated.View style={[styles.orb, styles.orb1, bubble1Style]} />
      <MAnimated.View style={[styles.orb, styles.orb2, bubble2Style]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <GradientText style={styles.title}>GOSSIP</GradientText>
            <View style={styles.subtitleContainer}>
              <View style={styles.line} />
              <Text style={styles.subtitle}>REFINED FOR THE ELITE</Text>
              <View style={styles.line} />
            </View>
          </View>

          {/* Center Space Brand Icon */}
          <View style={styles.logoSpace}>
            <MAnimated.View style={[styles.brandIconContainer, logoFloatStyle]}>
              <View style={styles.brandIconGlow} />
              <View style={styles.brandIconInner}>
                <Ionicons name="sparkles" size={50} color="#87CEEB" />
              </View>
            </MAnimated.View>
          </View>

          <CardWrapper intensity={30} tint="dark" style={[styles.glassCard, Platform.OS === 'android' && styles.androidCard]}>
            <View style={styles.tabsContainer}>
              <View style={[styles.tabIndicator, { left: mode === 'login' ? '2%' : '51%' }]} />
              <TouchableOpacity style={styles.tab} onPress={() => setMode('login')} activeOpacity={0.8}>
                <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tab} onPress={() => setMode('signup')} activeOpacity={0.8}>
                <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <View style={styles.iconBox}>
                  <Ionicons name="mail" size={18} color="#87CEEB" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {mode === 'signup' ? (
                <>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconBox}>
                      <Ionicons name="lock-closed" size={18} color="#FFB6C1" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Create Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconBox}>
                      <Ionicons name="shield-checkmark" size={18} color="#87CEEB" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                  </View>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleSignUp} disabled={operationLoading} activeOpacity={0.8}>
                    <LinearGradient colors={['#87CEEB', '#71bde0']} style={styles.buttonGradient}>
                      <Text style={styles.buttonText}>{operationLoading ? 'Processing...' : 'Create Account'}</Text>
                      <Ionicons name="arrow-forward" size={18} color="#000" />
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.inputWrapper}>
                    <View style={styles.iconBox}>
                      <Ionicons name="lock-closed" size={18} color="#FFB6C1" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                    />
                  </View>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={operationLoading} activeOpacity={0.8}>
                    <LinearGradient colors={['#87CEEB', '#71bde0']} style={styles.buttonGradient}>
                      <Text style={styles.buttonText}>{operationLoading ? 'Authenticating...' : 'Login'}</Text>
                      <Ionicons name="chevron-forward" size={18} color="#000" />
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {mode === 'login' ? "New to the elite?" : "Member already?"}
              </Text>
              <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                <Text style={styles.footerLink}>{mode === 'login' ? "Join Now" : "Login Instead"}</Text>
              </TouchableOpacity>
            </View>
          </CardWrapper>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.15 },
  orb1: { top: '5%', right: '-15%', backgroundColor: '#87CEEB' },
  orb2: { bottom: '15%', left: '-15%', backgroundColor: '#FFB6C1' },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 80 : 40, paddingBottom: 60 },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 48, fontWeight: Platform.OS === 'android' ? '700' : '900', letterSpacing: Platform.OS === 'android' ? 8 : 10, color: '#FFFFFF', textAlign: 'center' },
  subtitleContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingHorizontal: 20 },
  line: { height: 1, flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  subtitle: { fontSize: 10, letterSpacing: 4, color: 'rgba(255, 255, 255, 0.4)', fontWeight: '700', marginHorizontal: 16, textAlign: 'center' },
  glassCard: { borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', padding: 24 },
  androidCard: { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  tabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 16, padding: 4, marginBottom: 32, position: 'relative', height: 58 },
  tabIndicator: { position: 'absolute', width: '47%', height: '86%', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, top: '7%', borderWidth: 0.5, borderColor: 'rgba(255, 255, 255, 0.1)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabText: { fontSize: 15, fontWeight: '600', color: 'rgba(255, 255, 255, 0.35)' },
  activeTabText: { color: '#FFFFFF', fontWeight: '700' },
  form: { gap: 20 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 20, paddingHorizontal: 14, height: 64, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  primaryButton: { height: 64, borderRadius: 20, overflow: 'hidden', marginTop: 8 },
  buttonGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  buttonText: { color: '#000', fontSize: 18, fontWeight: '800' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32, gap: 10 },
  footerText: { color: 'rgba(255, 255, 255, 0.35)', fontSize: 14, fontWeight: '500' },
  footerLink: { color: '#87CEEB', fontSize: 14, fontWeight: '700' },
  logoSpace: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 160,
    marginVertical: 10,
  },
  brandIconContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    backgroundColor: 'rgba(135, 206, 235, 0.2)',
    borderRadius: 70,
    filter: Platform.OS === 'ios' ? 'blur(20px)' : undefined,
  },
  brandIconInner: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(135, 206, 235, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
});
