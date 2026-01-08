import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

interface ReactionPickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (emoji: string) => void;
    onShowEmojiPicker: () => void;
    activeReactions?: string[];
}

export function ReactionPicker({ visible, onClose, onSelect, onShowEmojiPicker, activeReactions = [] }: ReactionPickerProps) {
    const [fadeAnim] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [visible, fadeAnim]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
                    <View style={styles.emojiList}>
                        {QUICK_EMOJIS.map((emoji) => {
                            const isActive = activeReactions.includes(emoji);
                            return (
                                <TouchableOpacity
                                    key={emoji}
                                    style={[styles.emojiItem, isActive && styles.activeEmojiItem]}
                                    onPress={() => {
                                        onSelect(emoji);
                                        onClose();
                                    }}
                                >
                                    <Text style={styles.emojiText}>{emoji}</Text>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            style={styles.plusItem}
                            onPress={() => {
                                onShowEmojiPicker();
                                // We keep it open or close it depending on how the next picker works
                                // Usually close this one
                                onClose();
                            }}
                        >
                            <Ionicons name="add" size={20} color="#888" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#1C1C1E',
        borderRadius: 30,
        paddingHorizontal: 15,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    emojiList: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    emojiItem: {
        padding: 5,
        borderRadius: 20,
    },
    activeEmojiItem: {
        backgroundColor: 'rgba(135, 206, 235, 0.2)', // Light blue background for active
        transform: [{ scale: 1.1 }]
    },
    emojiText: {
        fontSize: 26,
    },
    plusItem: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2C2C2E',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 5,
    },
});
