import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { EmojiKeyboard } from 'rn-emoji-keyboard';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Image } from 'expo-image';

interface EmojiPickerProps {
    onEmojiSelected: (emoji: { emoji: string }) => void;
    onStickerSelected?: (sticker: any) => void;
    onStickerCreate?: () => void;
    height?: number;
}

export const EmojiPicker = ({ onEmojiSelected, onStickerSelected, onStickerCreate, height = 300 }: EmojiPickerProps) => {
    const [activeTab, setActiveTab] = useState<'emojis' | 'stickers'>('emojis');

    // Placeholder stickers (using emojis as stickers for now)
    const stickers = [
        { id: '1', url: 'https://img.icons8.com/color/96/ghost--v1.png', label: 'Ghost' },
        { id: '2', url: 'https://img.icons8.com/color/96/heart-with-arrow--v1.png', label: 'Heart' },
        { id: '3', url: 'https://img.icons8.com/color/96/beaming-face-with-smiling-eyes.png', label: 'Laugh' },
        { id: '4', url: 'https://img.icons8.com/color/96/crying-baby.png', label: 'Cry' },
    ];

    return (
        <View style={[styles.container, { height }]}>
            {/* Tab Content */}
            <View style={styles.content}>
                {activeTab === 'emojis' ? (
                    <EmojiKeyboard
                        onEmojiSelected={onEmojiSelected}
                        enableRecentlyUsed
                        categoryPosition="top"
                        enableSearchBar
                        theme={{
                            container: '#000000',
                            header: '#000000',
                            search: {
                                background: '#1A1A1A',
                                text: '#FFFFFF',
                                placeholder: '#666666',
                                icon: '#888888'
                            },
                            category: {
                                icon: '#666666',
                                active: '#87CEEB',
                                container: '#000000',
                                containerActive: '#1A1A1A'
                            }
                        }}
                        styles={{
                            header: { fontFamily: 'SpaceMono' },
                            container: { borderRadius: 0 },
                        }}
                    />
                ) : (
                    <View style={styles.stickerGrid}>
                        <TouchableOpacity
                            style={styles.stickerItem}
                            onPress={onStickerCreate}
                        >
                            <View style={styles.createStickerIcon}>
                                <Ionicons name="add" size={32} color="#87CEEB" />
                            </View>
                            <Text style={styles.createStickerText}>Create</Text>
                        </TouchableOpacity>

                        {stickers.map(sticker => (
                            <TouchableOpacity
                                key={sticker.id}
                                style={styles.stickerItem}
                                onPress={() => onStickerSelected?.(sticker)}
                            >
                                <Image source={{ uri: sticker.url }} style={styles.stickerImage} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {/* Bottom Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'emojis' && styles.activeTab]}
                    onPress={() => setActiveTab('emojis')}
                >
                    <Ionicons name="happy-outline" size={24} color={activeTab === 'emojis' ? "#87CEEB" : "#666"} />
                    <Text style={[styles.tabText, activeTab === 'emojis' && styles.activeTabText]}>Emojis</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'stickers' && styles.activeTab]}
                    onPress={() => setActiveTab('stickers')}
                >
                    <Ionicons name="images-outline" size={24} color={activeTab === 'stickers' ? "#87CEEB" : "#666"} />
                    <Text style={[styles.tabText, activeTab === 'stickers' && styles.activeTabText]}>Stickers</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000000',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    content: {
        flex: 1,
    },
    tabBar: {
        flexDirection: 'row',
        height: 50,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        backgroundColor: '#0A0A0A',
    },
    tab: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    activeTab: {
        backgroundColor: 'rgba(135, 206, 235, 0.05)',
    },
    tabText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#87CEEB',
    },
    stickerGrid: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 16,
    },
    stickerItem: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
    },
    stickerImage: {
        width: 60,
        height: 60,
    },
    createStickerIcon: {
        marginBottom: 4,
    },
    createStickerText: {
        color: '#87CEEB',
        fontSize: 12,
        fontWeight: '600',
    }
});
