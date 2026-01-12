import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Typography, Colors, Shadows, Spacing, BorderRadius } from '@/constants/theme';

interface MediaMenuProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (type: 'image' | 'file' | 'camera') => void;
}

export function MediaMenu({ visible, onClose, onSelect }: MediaMenuProps) {
    const menuItems = [
        { id: 'image', label: 'Gallery', icon: 'images', color: '#87CEEB' }, // Sky Blue
        { id: 'camera', label: 'Camera', icon: 'camera', color: '#87CEEB' },
        { id: 'file', label: 'Document', icon: 'document', color: '#87CEEB' },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.contentWrapper}>
                    <BlurView intensity={30} tint="dark" style={styles.menuContainer}>
                        <View style={styles.indicator} />
                        <View style={styles.grid}>
                            {menuItems.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.item}
                                    onPress={() => {
                                        onSelect(item.id as any);
                                        onClose();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconBg, { backgroundColor: 'rgba(135, 206, 235, 0.1)' }]}>
                                        <Ionicons name={item.icon as any} size={24} color={item.color} />
                                    </View>
                                    <Text style={styles.label}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </BlurView>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    contentWrapper: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    menuContainer: {
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        padding: 24,
        paddingBottom: 48,
    },
    indicator: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    item: {
        alignItems: 'center',
        width: '22%',
        marginBottom: 8,
    },
    iconBg: {
        width: 56,
        height: 56,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(135, 206, 235, 0.15)',
    },
    label: {
        ...Typography.caption,
        color: '#FFF',
        fontWeight: '600',
    },
});
