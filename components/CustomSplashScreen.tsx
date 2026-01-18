import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { GradientText } from './GradientText';

interface CustomSplashScreenProps {
    onAnimationComplete: () => void;
}

export const CustomSplashScreen: React.FC<CustomSplashScreenProps> = ({ onAnimationComplete }) => {
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Initial animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 10,
                friction: 6,
            }),
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 1000,
                delay: 200,
                useNativeDriver: true,
            })
        ]).start();

        // Wait and then fade out
        const timer = setTimeout(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                onAnimationComplete();
            });
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={styles.content}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Image
                        source={require('@/assets/app-icon.png')}
                        style={styles.logo}
                        contentFit="contain"
                    />
                </Animated.View>

                <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
                    <GradientText style={styles.title}>GOSSIP</GradientText>
                    <View style={styles.subtitleContainer}>
                        <View style={styles.line} />
                        <Text style={styles.subtitle}>REFINED FOR THE ELITE</Text>
                        <View style={styles.line} />
                    </View>
                </Animated.View>
            </View>

            <Text style={styles.footerNote}>Strictly for those who demand excellence.</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logo: {
        width: 140,
        height: 140,
        marginBottom: 20,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 42,
        fontWeight: Platform.OS === 'ios' ? '900' : 'bold',
        letterSpacing: 10,
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    line: {
        height: 1,
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    subtitle: {
        fontSize: 10,
        letterSpacing: 3,
        color: 'rgba(255, 255, 255, 0.4)',
        fontWeight: '600',
        marginHorizontal: 12,
        textAlign: 'center',
    },
    footerNote: {
        position: 'absolute',
        bottom: 50,
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.2)',
        fontWeight: '500',
        letterSpacing: 1,
    },
});
