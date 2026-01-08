import React from 'react';
import { View, StyleSheet, Modal, Dimensions, TouchableOpacity, Pressable } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface FullScreenImageViewerProps {
    visible: boolean;
    imageUri: string;
    onClose: () => void;
}

export function FullScreenImageViewer({ visible, imageUri, onClose }: FullScreenImageViewerProps) {
    const insets = useSafeAreaInsets();
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withSpring(1);
                savedScale.value = 1;
            } else {
                savedScale.value = scale.value;
            }
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onStart(() => {
            if (scale.value > 1) {
                scale.value = withSpring(1);
                translateX.value = withSpring(0);
                translateY.value = withSpring(0);
                savedScale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                scale.value = withSpring(2);
                savedScale.value = 2;
            }
        });

    const composed = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const handleClose = () => {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        onClose();
    };

    return (
        <Modal visible={visible} transparent onRequestClose={handleClose} animationType="fade">
            <GestureHandlerRootView style={styles.container}>
                <Pressable style={styles.overlay} onPress={handleClose} />

                <TouchableOpacity
                    style={[styles.closeButton, { top: insets.top + 10 }]}
                    onPress={handleClose}
                >
                    <Ionicons name="close" size={30} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.imageContainer}>
                    <GestureDetector gesture={composed}>
                        <Animated.View style={animatedStyle}>
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.fullImage}
                                contentFit="contain"
                            />
                        </Animated.View>
                    </GestureDetector>
                </View>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: width,
        height: height,
    },
});
