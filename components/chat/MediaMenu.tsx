import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MediaMenuProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (type: 'image' | 'file' | 'audio' | 'camera') => void;
}

export function MediaMenu({ visible, onClose, onSelect }: MediaMenuProps) {
    const menuItems = [
        { id: 'image', label: 'Gallery', icon: 'images', color: '#9C27B0' },
        { id: 'camera', label: 'Camera', icon: 'camera', color: '#FF4081' },
        { id: 'file', label: 'Document', icon: 'document', color: '#2196F3' },
        { id: 'audio', label: 'Audio', icon: 'musical-notes', color: '#4CAF50' },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.menuContainer}>
                    <View style={styles.grid}>
                        {menuItems.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.item}
                                onPress={() => {
                                    onSelect(item.id as any);
                                    onClose();
                                }}
                            >
                                <View style={[styles.iconBg, { backgroundColor: item.color }]}>
                                    <Ionicons name={item.icon as any} size={28} color="#FFF" />
                                </View>
                                <Text style={styles.label}>{item.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    menuContainer: {
        backgroundColor: '#1A1A1A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 48,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        gap: 20,
    },
    item: {
        alignItems: 'center',
        width: '20%',
        minWidth: 80,
    },
    iconBg: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
    },
});
