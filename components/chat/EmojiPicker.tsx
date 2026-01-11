import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { EmojiKeyboard, useRecentPicksPersistence } from 'rn-emoji-keyboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Image } from 'expo-image';

interface EmojiPickerProps {
    onEmojiSelected: (emoji: { emoji: string }) => void;
    onStickerSelected?: (sticker: any) => void;
    onStickerCreate?: () => void;
    height?: number;
}

export const EmojiPicker = ({ onEmojiSelected, height = 300 }: EmojiPickerProps) => {
    useRecentPicksPersistence({
        initialization: async () => {
            const result = await AsyncStorage.getItem('RN_EMOJI_KEYBOARD_RECENT_PICKS');
            return result ? JSON.parse(result) : [];
        },
        onStateChange: (nextState) => {
            AsyncStorage.setItem('RN_EMOJI_KEYBOARD_RECENT_PICKS', JSON.stringify(nextState));
        },
    });

    return (
        <View style={[styles.container, { height }]}>
            <EmojiKeyboard
                onEmojiSelected={onEmojiSelected}
                enableRecentlyUsed
                categoryPosition="top"
                enableSearchBar
                categoryOrder={[
                    'recently_used',
                    'smileys_emotion',
                    'people_body',
                    'animals_nature',
                    'food_drink',
                    'travel_places',
                    'activities',
                    'objects',
                    'symbols',
                    'flags',
                ]}
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
                        iconActive: '#87CEEB',
                        container: '#000000',
                        containerActive: '#1A1A1A'
                    }
                }}
                styles={{
                    header: { fontFamily: 'SpaceMono' },
                    container: {
                        borderRadius: 0,
                        flex: 1,
                        backgroundColor: '#000000',
                        paddingBottom: 0,
                        paddingTop: 0
                    },
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000000',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
});
