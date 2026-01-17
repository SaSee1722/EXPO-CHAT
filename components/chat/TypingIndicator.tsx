import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
} from 'react-native-reanimated';

export function TypingIndicator() {
    const dot1 = useSharedValue(0);
    const dot2 = useSharedValue(0);
    const dot3 = useSharedValue(0);

    useEffect(() => {
        const startAnimation = () => {
            dot1.value = withRepeat(
                withSequence(
                    withTiming(-6, { duration: 500 }),
                    withTiming(0, { duration: 500 })
                ),
                -1
            );

            dot2.value = withDelay(
                200,
                withRepeat(
                    withSequence(
                        withTiming(-6, { duration: 500 }),
                        withTiming(0, { duration: 500 })
                    ),
                    -1
                )
            );

            dot3.value = withDelay(
                400,
                withRepeat(
                    withSequence(
                        withTiming(-6, { duration: 500 }),
                        withTiming(0, { duration: 500 })
                    ),
                    -1
                )
            );
        };

        startAnimation();

        return () => {
            dot1.value = 0;
            dot2.value = 0;
            dot3.value = 0;
        };
    }, [dot1, dot2, dot3]);

    const dotStyle1 = useAnimatedStyle(() => ({
        transform: [{ translateY: dot1.value }],
    }));

    const dotStyle2 = useAnimatedStyle(() => ({
        transform: [{ translateY: dot2.value }],
    }));

    const dotStyle3 = useAnimatedStyle(() => ({
        transform: [{ translateY: dot3.value }],
    }));

    return (
        <View style={styles.container}>
            <View style={styles.bubble}>
                <Animated.View style={[styles.dot, dotStyle1]} />
                <Animated.View style={[styles.dot, dotStyle2]} />
                <Animated.View style={[styles.dot, dotStyle3]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'flex-start',
    },
    bubble: {
        flexDirection: 'row',
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 20,
        borderBottomLeftRadius: 4,
        gap: 4,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 50,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#87CEEB',
    },
});
