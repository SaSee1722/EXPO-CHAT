import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { GradientText } from '@/components/GradientText';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';

const { width, height } = Dimensions.get('window');

export default function GetStartedScreen() {
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 1200,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#050505', '#1a1a1a', '#050505']}
                style={StyleSheet.absoluteFill}
            />

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
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('@/assets/images/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <View style={styles.logoGlow} />
                    </View>
                    <GradientText style={styles.title}>GOSSIP</GradientText>
                    <View style={styles.subtitleContainer}>
                        <View style={styles.line} />
                        <Text style={styles.subtitle}>REFINED FOR THE ELITE</Text>
                        <View style={styles.line} />
                    </View>
                </View>

                <View style={styles.glassCard}>
                    <Text style={styles.tagline}>
                        The most exclusive social experience ever created.
                    </Text>

                    <View style={styles.features}>
                        <FeatureItem icon="shield-checkmark-outline" text="Secure & Private" />
                        <FeatureItem icon="videocam-outline" text="Elite Calls" />
                        <FeatureItem icon="sparkles-outline" text="Premium UX" />
                    </View>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/auth')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Get Started</Text>
                        <Ionicons name="chevron-forward" size={20} color="#000" />
                    </TouchableOpacity>

                    <Text style={styles.footerNote}>
                        Strictly for those who demand excellence.
                    </Text>
                </View>
            </Animated.View>
        </View>
    );
}

function FeatureItem({ icon, text }: { icon: any, text: string }) {
    return (
        <View style={styles.featureItem}>
            <Ionicons name={icon} size={20} color="#87CEEB" />
            <Text style={styles.featureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
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
    logoContainer: {
        width: 120,
        height: 120,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    logo: {
        width: 100,
        height: 100,
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
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 40,
        elevation: 8,
    },
    tagline: {
        fontSize: 20,
        color: '#FFFFFF',
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: 32,
    },
    features: {
        gap: 16,
        marginBottom: 40,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
    },
    featureText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    primaryButton: {
        backgroundColor: '#87CEEB',
        height: 60,
        borderRadius: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        shadowColor: '#87CEEB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    footerNote: {
        marginTop: 20,
        fontSize: 12,
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        fontWeight: '500',
    },
});
