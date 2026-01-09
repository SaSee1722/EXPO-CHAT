import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PinInputProps {
    onComplete: (pin: string) => void;
    onCancel?: () => void;
    title?: string;
    subtitle?: string;
    error?: string;
}

export function PinInput({ onComplete, onCancel, title = 'Enter PIN', subtitle, error }: PinInputProps) {
    const [pin, setPin] = useState(['', '', '', '']);
    const inputRefs = [
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
        useRef<TextInput>(null),
    ];
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Auto-focus first input
        inputRefs[0].current?.focus();
    }, []);

    useEffect(() => {
        if (error) {
            // Shake animation on error
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();

            // Clear PIN on error
            setPin(['', '', '', '']);
            inputRefs[0].current?.focus();
        }
    }, [error]);

    const handleChange = (value: string, index: number) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs[index + 1].current?.focus();
        }

        // Check if PIN is complete
        if (newPin.every(digit => digit !== '')) {
            onComplete(newPin.join(''));
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {onCancel && (
                    <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                )}

                <View style={styles.iconContainer}>
                    <Ionicons name="lock-closed" size={48} color="#87CEEB" />
                </View>

                <Text style={styles.title}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

                <Animated.View style={[styles.pinContainer, { transform: [{ translateX: shakeAnim }] }]}>
                    {pin.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={inputRefs[index]}
                            style={[
                                styles.pinInput,
                                digit !== '' && styles.pinInputFilled,
                                error && styles.pinInputError,
                            ]}
                            value={digit}
                            onChangeText={(value) => handleChange(value, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            secureTextEntry
                            selectTextOnFocus
                        />
                    ))}
                </Animated.View>

                {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 40,
    },
    closeButton: {
        position: 'absolute',
        top: -100,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(135, 206, 235, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: 32,
        textAlign: 'center',
    },
    pinContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    pinInput: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
        textAlign: 'center',
    },
    pinInputFilled: {
        borderColor: '#87CEEB',
        backgroundColor: 'rgba(135, 206, 235, 0.1)',
    },
    pinInputError: {
        borderColor: '#FF4458',
        backgroundColor: 'rgba(255, 68, 88, 0.1)',
    },
    errorText: {
        color: '#FF4458',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
    },
});
