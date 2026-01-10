import React, { useState } from 'react';
import { View, StyleSheet, Modal, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { PinInput } from './PinInput';

export interface LockedChatScreenRef {
    triggerUnlock: () => void;
}

interface LockedChatScreenProps {
    otherUserName: string;
    onUnlock: (pin: string) => Promise<boolean>;
    onMaxAttempts: () => void;
    unlockRef?: React.RefObject<LockedChatScreenRef>;
}

export function LockedChatScreen({ otherUserName, onUnlock, onMaxAttempts, unlockRef }: LockedChatScreenProps) {
    const [showPinInput, setShowPinInput] = useState(false);
    const [pinError, setPinError] = useState('');
    const [attempts, setAttempts] = useState(0);
    const translateY = useSharedValue(0);

    React.useImperativeHandle(unlockRef, () => ({
        triggerUnlock: () => setShowPinInput(true)
    }));

    const handlePinComplete = async (pin: string) => {
        const isValid = await onUnlock(pin);
        if (!isValid) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setPinError('Incorrect PIN');

            if (newAttempts >= 2) {
                onMaxAttempts();
                setShowPinInput(false);
            } else {
                setTimeout(() => setPinError(''), 1500);
            }
        } else {
            setAttempts(0);
            setShowPinInput(false);
        }
    };

    const gesture = Gesture.Pan()
        .onUpdate((event) => {
            // Only allow upward swipes
            if (event.translationY < 0) {
                translateY.value = event.translationY;
            }
        })
        .onEnd((event) => {
            // If swiped up more than 100px, show PIN input
            if (event.translationY < -100) {
                runOnJS(setShowPinInput)(true);
            }
            translateY.value = withSpring(0);
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    return (
        <View style={styles.container}>
            {/* Gesture detector for the entire screen area */}
            <GestureDetector gesture={gesture}>
                <Animated.View style={[styles.lockedArea, animatedStyle]}>
                    <Text style={styles.loadingText}>Loading...</Text>
                    <Text style={styles.commentText}>such a yechaa behaviour bro 😤💦</Text>
                </Animated.View>
            </GestureDetector>

            {/* PIN Input Modal */}
            <Modal
                visible={showPinInput}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPinInput(false)}
            >
                <PinInput
                    title="Enter PIN"
                    subtitle={`Unlock chat with ${otherUserName}`}
                    onComplete={handlePinComplete}
                    onCancel={() => setShowPinInput(false)}
                    error={pinError}
                />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    lockedArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: 1,
    },
    commentText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 14,
        marginTop: 8,
        fontStyle: 'italic',
    },
});
