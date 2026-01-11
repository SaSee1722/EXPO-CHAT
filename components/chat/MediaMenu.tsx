import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    SlideInDown,
    FadeIn
} from 'react-native-reanimated';
import { Typography, Colors, Shadows, BorderRadius } from '@/constants/theme';

interface MediaMenuProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (type: 'image' | 'file' | 'audio' | 'camera') => void;
}

const { width } = Dimensions.get('window');

export function MediaMenu({ visible, onClose, onSelect }: MediaMenuProps) {
    const menuItems = [
        {
            id: 'camera',
            label: 'Camera',
            icon: 'camera',
            color: '#FF453A',
            bgColor: 'rgba(255, 69, 58, 0.15)'
        },
        {
            id: 'image',
            label: 'Photos',
            icon: 'images',
            color: '#0A84FF',
            bgColor: 'rgba(10, 132, 255, 0.15)'
        },
        {
            id: 'file',
            label: 'Document',
            icon: 'document-text',
            color: '#BF5AF2',
            bgColor: 'rgba(191, 90, 242, 0.15)'
        },
    ];

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={StyleSheet.absoluteFill}
                >
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                </Animated.View>

                <Animated.View
                    entering={SlideInDown.springify().damping(15)}
                    style={styles.sheetContainer}
                >
                    <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
                        <View style={styles.handle} />

                        <View style={styles.grid}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.itemContainer}
                                    onPress={() => {
                                        onSelect(item.id as any);
                                        onClose();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                                        <Ionicons name={item.icon as any} size={28} color={item.color} />
                                    </View>
                                    <Text style={styles.label}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeText}>Cancel</Text>
                        </TouchableOpacity>
                    </BlurView>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    sheetContainer: {
        width: '100%',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
    },
    blurContainer: {
        padding: 20,
        paddingBottom: 40,
        width: '100%',
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 25,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    itemContainer: {
        alignItems: 'center',
        width: width / 3.5,
        marginBottom: 20,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        ...Shadows.medium,
    },
    label: {
        ...Typography.caption,
        color: '#FFF',
        fontSize: 13,
        fontWeight: '500',
    },
    closeButton: {
        width: '100%',
        paddingVertical: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    closeText: {
        ...Typography.body,
        color: '#FFF',
        fontWeight: '600',
    }
});
