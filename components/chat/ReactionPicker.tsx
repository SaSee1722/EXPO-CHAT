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
    onReply?: () => void;
    onDelete?: () => void;
    onDeleteForEveryone?: () => void;
    isOwnMessage?: boolean;
}

export function ReactionPicker({ visible, onClose, onSelect, onShowEmojiPicker, activeReactions = [], onReply, onDelete, onDeleteForEveryone, isOwnMessage }: ReactionPickerProps) {
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
                                onClose();
                            }}
                        >
                            <Ionicons name="add" size={20} color="#888" />
                        </TouchableOpacity>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                        {onReply && (
                            <TouchableOpacity style={styles.actionButton} onPress={() => { onReply(); onClose(); }}>
                                <Ionicons name="arrow-undo" size={18} color="#87CEEB" />
                                <Text style={styles.actionText}>Reply</Text>
                            </TouchableOpacity>
                        )}
                        {onDelete && (
                            <TouchableOpacity style={styles.actionButton} onPress={() => { onDelete(); onClose(); }}>
                                <Ionicons name="trash-outline" size={18} color="#FF4458" />
                                <Text style={styles.actionText}>Delete for Me</Text>
                            </TouchableOpacity>
                        )}
                        {isOwnMessage && onDeleteForEveryone && (
                            <TouchableOpacity style={styles.actionButton} onPress={() => { onDeleteForEveryone(); onClose(); }}>
                                <Ionicons name="trash" size={18} color="#FF4458" />
                                <Text style={styles.actionText}>Delete for Everyone</Text>
                            </TouchableOpacity>
                        )}
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
    actionsContainer: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#3A3A3A',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#2C2C2E',
        gap: 10,
    },
    actionText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '500',
    },
});
