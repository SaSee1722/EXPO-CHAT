import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { GradientText } from '@/components/GradientText';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import MAnimated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function GetStartedScreen() {
    const router = useRouter();

    // Reanimated values for background movement
    const bubble1X = useSharedValue(0);
    const bubble1Y = useSharedValue(0);
    const bubble2X = useSharedValue(0);
    const bubble2Y = useSharedValue(0);

    // Fade/Slide animations for content
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        // Content animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                delay: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 1000,
                delay: 200,
                useNativeDriver: true,
            })
        ]).start();

        // Background animations
        bubble1X.value = withRepeat(
            withSequence(
                withTiming(width * 0.2, { duration: 8000 }),
                withTiming(-width * 0.2, { duration: 8000 })
            ),
            -1,
            true
        );
        bubble1Y.value = withRepeat(
            withSequence(
                withTiming(height * 0.1, { duration: 10000 }),
                withTiming(-height * 0.1, { duration: 10000 })
            ),
            -1,
            true
        );
        bubble2X.value = withRepeat(
            withSequence(
                withTiming(-width * 0.3, { duration: 12000 }),
                withTiming(width * 0.3, { duration: 12000 })
            ),
            -1,
            true
        );
        bubble2Y.value = withRepeat(
            withSequence(
                withTiming(height * 0.15, { duration: 9000 }),
                withTiming(-height * 0.15, { duration: 9000 })
            ),
            -1,
            true
        );
    }, []);

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

    const bubble1Style = useAnimatedStyle(() => ({
        transform: [
            { translateX: bubble1X.value },
            { translateY: bubble1Y.value }
        ]
    }));

    const bubble2Style = useAnimatedStyle(() => ({
        transform: [
            { translateX: bubble2X.value },
            { translateY: bubble2Y.value }
        ]
    }));

    return (
        <View style={styles.container}>
            {/* Dark gradient base */}
            <LinearGradient
                colors={['#050505', '#0f0f12', '#050505']}
                style={StyleSheet.absoluteFill}
            />

            {/* Animated Background Elements */}
            <MAnimated.View style={[styles.bubble, styles.bubble1, bubble1Style]}>
                <LinearGradient
                    colors={['rgba(135, 206, 235, 0.2)', 'rgba(135, 206, 235, 0)']}
                    style={StyleSheet.absoluteFill}
                />
            </MAnimated.View>
            <MAnimated.View style={[styles.bubble, styles.bubble2, bubble2Style]}>
                <LinearGradient
                    colors={['rgba(255, 182, 193, 0.15)', 'rgba(255, 182, 193, 0)']}
                    style={StyleSheet.absoluteFill}
                />
            </MAnimated.View>

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}
            >
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
                            <Image
                                source={require('@/assets/images/logo.png')}
                                style={styles.brandLogoImage}
                                resizeMode="contain"
                            />
                        </View>
                    </MAnimated.View>
                </View>

                {Platform.OS === 'ios' ? (
                    <BlurView intensity={20} tint="dark" style={styles.glassCard}>
                        <CardContent router={router} />
                    </BlurView>
                ) : (
                    <View style={styles.androidGlassCard}>
                        <CardContent router={router} />
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

function CardContent({ router }: { router: any }) {
    return (
        <View style={styles.cardInternal}>
            <Text style={styles.tagline}>
                The most exclusive social experience ever created.
            </Text>

            <View style={styles.features}>
                <FeatureItem icon="shield-checkmark" text="Secure & Private" color="#87CEEB" />
                <FeatureItem icon="videocam" text="Elite Calls" color="#FFB6C1" />
                <FeatureItem icon="sparkles" text="Premium UX" color="#87CEEB" />
            </View>

            <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/auth')}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={['#87CEEB', '#76c4e4']}
                    style={styles.buttonGradient}
                >
                    <Text style={styles.buttonText}>Get Started</Text>
                    <Ionicons name="arrow-forward" size={20} color="#000" />
                </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footerNote}>
                Strictly for those who demand excellence.
            </Text>
        </View>
    );
}

function FeatureItem({ icon, text, color }: { icon: any, text: string, color: string }) {
    return (
        <View style={styles.featureItem}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    bubble: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.6,
    },
    bubble1: {
        top: '10%',
        left: '-10%',
    },
    bubble2: {
        bottom: '20%',
        right: '-10%',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: height * 0.12,
        paddingBottom: 40,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
    },
    title: {
        fontSize: 48,
        fontWeight: Platform.OS === 'android' ? '700' : '900',
        letterSpacing: Platform.OS === 'android' ? 8 : 10,
        color: '#FFFFFF',
        textAlign: 'center',
    },
    subtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingHorizontal: 20,
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
        backgroundColor: 'rgba(135, 206, 235, 0.15)',
        borderRadius: 70,
        filter: Platform.OS === 'ios' ? 'blur(25px)' : undefined,
    },
    brandIconInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderWidth: 1.5,
        borderColor: 'rgba(135, 206, 235, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#87CEEB',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.7,
        shadowRadius: 20,
        elevation: 15,
        overflow: 'hidden',
    },
    brandLogoImage: {
        width: '100%',
        height: '100%',
    },
    glassCard: {
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    androidGlassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardInternal: {
        padding: 30,
        alignItems: 'center',
    },
    tagline: {
        fontSize: 22,
        color: '#FFFFFF',
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 30,
        marginBottom: 32,
    },
    features: {
        width: '100%',
        gap: 12,
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    primaryButton: {
        width: '100%',
        height: 64,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    buttonText: {
        color: '#000',
        fontSize: 19,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    footerNote: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.35)',
        textAlign: 'center',
        fontWeight: '500',
        letterSpacing: 0.5,
    },
});
